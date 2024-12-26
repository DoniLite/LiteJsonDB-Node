const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log4js = require('log4js');
const { createCipheriv, createDecipheriv } = require('crypto');
require('dotenv').config();

// --- Constants and Configurations ---
const DATABASE_DIR = 'database';
const DEFAULT_DB_FILE = 'database.json';
const LOG_FILE = 'LiteJsonDb.log';
const DEFAULT_ENCRYPTION_METHOD = 'base64';
const SECRET_KEY = process.env.SECRET_KEY || "default_key";
const IV_LENGTH = 16;

// --- Setup Database Directory and File ---
const initializeDatabase = (filename) => {
    if (!fs.existsSync(DATABASE_DIR)) {
        try {
            fs.mkdirSync(DATABASE_DIR, { recursive: true });
            console.info(`Database directory '${DATABASE_DIR}' created.`);
        } catch (err) {
            console.error(`Failed to create database directory '${DATABASE_DIR}'. ${err.message}`);
            throw err;
        }
    }
    const dbFile = path.join(DATABASE_DIR, filename);
    if (!fs.existsSync(dbFile)) {
        try {
            fs.writeFileSync(dbFile, JSON.stringify({}));
            console.info(`Database file '${filename}' created.`);
        } catch (err) {
            console.error(`Failed to create database file '${filename}'. ${err.message}`);
            throw err;
        }
    }
};

// --- Logging Configuration ---
log4js.configure({
    appenders: { LiteJsonDb: { type: 'file', filename: path.join(DATABASE_DIR, LOG_FILE) } },
    categories: { default: { appenders: ['LiteJsonDb'], level: 'info' } }
});
const logger = log4js.getLogger('LiteJsonDb');

// --- Utility Functions Module ---
const utils = {
    hashPassword: (password) => crypto.createHash('sha256').update(password).digest('hex'),
    checkPassword: (storedHash, password) => storedHash === utils.hashPassword(password),
    getOrDefault: (data, key, defaultValue = null) => data && data.hasOwnProperty(key) ? data[key] : defaultValue,
    keyExistsOrAdd: (data, key, defaultValue) => data.hasOwnProperty(key) ? true : (data[key] = defaultValue, false),
    searchData: (data, searchValue, key) => {
        const results = {};
        const searchRecursive = (d, value, currentKey = '') => {
            if (typeof d === 'object' && d !== null) {
                if (Array.isArray(d)) {
                    d.forEach((item, index) => searchRecursive(item, value, `${currentKey}/${index}`));
                } else {
                    Object.entries(d).forEach(([k, v]) => {
                        const newKey = currentKey ? `${currentKey}/${k}` : k;
                        if (typeof v === 'object' && v !== null) {
                            searchRecursive(v, value, newKey);
                        } else if (v === value || String(v) === String(value)) {
                            results[newKey] = v;
                        }
                    });
                }
            }
        };
        if (key) {
            if (data && data.hasOwnProperty(key)) searchRecursive(data[key], searchValue);
            else console.error(`Key '${key}' not found.`);
        } else searchRecursive(data, searchValue);
        if (Object.keys(results).length === 0) console.error(`No matches found for '${searchValue}'.`);
        return results;
    },
    flattenJSON: (data) => {
        const result = {};
        const flatten = (obj, parentKey = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const newKey = parentKey ? `${parentKey}.${key}` : key;
                if (typeof value === 'object' && value !== null && !Array.isArray(value))
                    flatten(value, newKey);
                else result[newKey] = value;
            }
        };
        flatten(data);
        return result;
    },
    convertToDateTime: (timestamp) => new Date(timestamp).toLocaleString(),
    sanitizeOutput: (data) => JSON.stringify(data, null, 2),
    prettyPrint: (data) => console.log(JSON.stringify(data, null, 2)),
};

// --- Encryption Module ---
const encryption = {
    base64: {
        encrypt: (text) => Buffer.from(text).toString('base64'),
        decrypt: (encoded) => {
            try {
                return Buffer.from(encoded, 'base64').toString('utf-8')
            } catch (e) {
                console.error('Decryption error with base64', e);
                return '';
            }
        },
    },
    crypto: {
        encrypt: (text, secretKey) => {
             if (!secretKey) {
                 console.error('Secret key required for crypto encryption.');
                throw new Error("Encryption Error: Secret key is required for crypto encryption.");
            }
             if (Buffer.from(secretKey, 'hex').length !== 32) {
                console.error('Secret key must be a 32-byte hex string for crypto encryption.');
                throw new Error("Encryption Error: Invalid secret key length for crypto encryption.");
            }
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
            let encrypted = cipher.update(text, 'utf-8', 'hex');
            encrypted += cipher.final('hex');
            return `${iv.toString('hex')}:${encrypted}`;
        },
        decrypt: (encoded, secretKey) => {
             if (!secretKey) {
                 console.error('Secret key required for crypto decryption.');
                throw new Error("Decryption Error: Secret key is required for crypto decryption.");
            }
           if (Buffer.from(secretKey, 'hex').length !== 32) {
                console.error('Secret key must be a 32-byte hex string for crypto decryption.');
                throw new Error("Decryption Error: Invalid secret key length for crypto decryption.");
            }
            try {
                const [ivHex, encryptedHex] = encoded.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
                let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
                decrypted += decipher.final('utf-8');
                return decrypted;
            } catch (e) {
                 console.error('Decryption error with crypto', e);
                return '';
            }
        },
    },
};

// --- JsonDB Class ---
class JsonDB {
    constructor(filename = DEFAULT_DB_FILE, options = {}) {
        this.filename = path.join(DATABASE_DIR, filename);
        this.crypted = options.crypted || false;
        this.encryptionMethod =  (this.crypted ? 'base64' : options.encryptionMethod) || DEFAULT_ENCRYPTION_METHOD;
        this.secretKey = options.secretKey || SECRET_KEY;
         this.enableLog = options.enableLog;
        this.autoBackup = options.autoBackup;
        initializeDatabase(filename);
        this.db = {};
        this._loadDb();
       if (this.crypted && !this.secretKey) {
            console.error('Secret key is required for encryption.');
            throw new Error(`Encryption Error: Secret key is required for encryption.`);
        }
    }
    _logError(message) {
        console.error(`\x1b[31m${message}\x1b[0m`);
        if (this.enableLog) {
            logger.error(message);
        }
    }

    _loadDb() {
        try {
            let rawData = fs.readFileSync(this.filename, 'utf-8');
            if (rawData.trim() === '') {
                rawData = '{}';
            }
            if (this.crypted) {
                 if (!encryption[this.encryptionMethod]) {
                      console.error(`Invalid encryption method '${this.encryptionMethod}'.`);
                    throw new Error(`Encryption Error: Invalid encryption method '${this.encryptionMethod}'`);
                 }
                 if(rawData !== '{}'){
                      rawData = encryption[this.encryptionMethod].decrypt(rawData, this.secretKey);
                 }

            }

            this.db = JSON.parse(rawData);
        } catch (err) {
             console.error('Failed to load database. Invalid JSON.');
            throw err;
        }
    }

    _saveDb() {
        try {
            let dataToSave = JSON.stringify(this.db, null, 4);
            if (this.crypted) {
                if (!encryption[this.encryptionMethod]) {
                      console.error(`Invalid encryption method '${this.encryptionMethod}'.`);
                    throw new Error(`Save DB Error: Invalid encryption method '${this.encryptionMethod}'`);
                }
                dataToSave = encryption[this.encryptionMethod].encrypt(dataToSave, this.secretKey);
            }
            fs.writeFileSync(this.filename, dataToSave);
             if (this.enableLog) logger.info(`Database saved to '${this.filename}'.`);
        } catch (err) {
             console.error('Failed to save database. Check permissions.');
            throw err;
        }
    }

    _setChild(parent, childKey, value) {
        const keys = childKey.split('/');
        keys.slice(0, -1).forEach(key => parent = parent[key] = parent[key] || {});
        parent[keys[keys.length - 1]] = value;
    }

    _mergeDicts(dict1, dict2) {
        for (const [key, value] of Object.entries(dict2)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value) && dict1[key] && typeof dict1[key] === 'object') {
                dict1[key] = this._mergeDicts(dict1[key], value);
            } else {
                dict1[key] = value;
            }
        }
        return dict1;
    }

    keyExists(key) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
            console.error('Invalid key, provide a non-empty string.');
            return false;
        }
        const keys = key.split('/');
        let data = this.db;
        for (const k of keys) {
            if (data && k in data) {
                data = data[k];
            } else {
                return false;
            }
        }
        return true;
    }

    getData(key) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
             console.error('Invalid key, provide a non-empty string.');
            return null;
        }
        const keys = key.split('/');
        let data = this.db;
        for (const k of keys) {
            if (data && k in data) {
                data = data[k];
            } else {
                 console.error(`Key '${key}' not found.`);
                return null;
            }
        }
        return data;
    }

    setData(key, value = {}) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
            console.error('Invalid key, provide a non-empty string.');
            return;
        }
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
             console.error('Data must be an object.');
            return;
        }
        if (this.keyExists(key)) {
             console.error(`Key '${key}' already exists, use 'editData' instead.`);
            return;
        }
        this._setChild(this.db, key, value);
        this._saveDb();
    }

    editData(key, value) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
             console.error('Invalid key, provide a non-empty string.');
            return;
        }
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
             console.error('Data must be an object.');
            return;
        }
        if (!this.keyExists(key)) {
              console.error(`Key '${key}' does not exist, use 'setData' instead.`);
            return;
        }
        const currentData = this.getData(key);
        this._setChild(this.db, key, this._mergeDicts(currentData, value));
        this._saveDb();
    }

    deleteData(key) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
             console.error('Invalid key, provide a non-empty string.');
            return;
        }
        if (!this.keyExists(key)) {
              console.error(`Key '${key}' not found, cannot delete.`);
            return;
        }
        const keys = key.split('/');
        let data = this.db;
        keys.slice(0, -1).forEach(k => data = data[k]);
        delete data[keys[keys.length - 1]];
        this._saveDb();
    }

    setSubcollection(parentKey, subcollectionKey, subcollectionData) {
        if (!parentKey || typeof parentKey !== 'string' || parentKey.trim() === '') {
             console.error('Invalid parent key, provide a non-empty string.');
            return;
        }
        if (!subcollectionKey || typeof subcollectionKey !== 'string' || subcollectionKey.trim() === '') {
             console.error('Invalid subcollection key, provide a non-empty string.');
            return;
        }
        if (!this.keyExists(parentKey)) {
            console.error(`Parent key '${parentKey}' not found, cannot add subcollection.`);
            return;
        }
        if (typeof subcollectionData !== 'object' || subcollectionData === null || Array.isArray(subcollectionData)) {
             console.error('Subcollection data must be an object.');
            return;
        }
        const parentData = this.getData(parentKey);
        if (!parentData[subcollectionKey]) {
            parentData[subcollectionKey] = {};
        }
        parentData[subcollectionKey] = { ...parentData[subcollectionKey], ...subcollectionData };
        this.editData(parentKey, parentData);
         if (this.enableLog) logger.info(`Subcollection '${subcollectionKey}' added/updated for parent '${parentKey}'.`);
    }

    editSubcollection(parentKey, subcollectionKey, subcollectionData) {
        if (!parentKey || typeof parentKey !== 'string' || parentKey.trim() === '') {
             console.error('Invalid parent key, provide a non-empty string.');
            return;
        }
        if (!subcollectionKey || typeof subcollectionKey !== 'string' || subcollectionKey.trim() === '') {
             console.error('Invalid subcollection key, provide a non-empty string.');
            return;
        }
        if (!this.keyExists(`${parentKey}/${subcollectionKey}`)) {
             console.error(`Sub-collection '${subcollectionKey}' under '${parentKey}' not found, cannot edit.`);
            return;
        }
        if (typeof subcollectionData !== 'object' || subcollectionData === null || Array.isArray(subcollectionData)) {
             console.error('Subcollection data must be an object.');
            return;
        }
        const subcollectionDataCurrent = this.getData(`${parentKey}/${subcollectionKey}`);
        const mergedData = this._mergeDicts(subcollectionDataCurrent, subcollectionData);
        this.setSubcollection(parentKey, subcollectionKey, mergedData);
         if (this.enableLog) logger.info(`Subcollection '${subcollectionKey}' updated for parent '${parentKey}'.`);
    }

    getSubcollection(parentKey, subcollectionKey = null) {
        if (!parentKey || typeof parentKey !== 'string' || parentKey.trim() === '') {
            console.error('Invalid parent key, provide a non-empty string.');
            return null;
        }
        if (subcollectionKey && (typeof subcollectionKey !== 'string' || subcollectionKey.trim() === '')) {
             console.error('Invalid subcollection key, provide a non-empty string.');
            return null;
        }
        if (!this.keyExists(parentKey)) {
             console.error(`Parent key '${parentKey}' not found, cannot get subcollection.`);
            return null;
        }
        const parentData = this.getData(parentKey);
        if (subcollectionKey) {
            return parentData[subcollectionKey] || null;
        }
        return parentData;
    }


    deleteSubcollection(parentKey, subcollectionKey) {
        if (!parentKey || typeof parentKey !== 'string' || parentKey.trim() === '') {
            console.error('Invalid parent key, provide a non-empty string.');
            return;
        }
        if (!subcollectionKey || typeof subcollectionKey !== 'string' || subcollectionKey.trim() === '') {
            console.error('Invalid subcollection key, provide a non-empty string.');
            return;
        }
        if (!this.keyExists(`${parentKey}/${subcollectionKey}`)) {
            console.error(`Sub-collection '${subcollectionKey}' under '${parentKey}' not found, cannot delete.`);
            return;
        }
        const parentData = this.getData(parentKey);
        delete parentData[subcollectionKey];
        this.editData(parentKey, parentData);
        if (this.enableLog) logger.info(`Subcollection '${subcollectionKey}' deleted for parent '${parentKey}'.`);
    }

    backupDb(backupFile) {
        if (!backupFile || typeof backupFile !== 'string' || backupFile.trim() === '') {
            console.error('Invalid backup file name, provide a non-empty string.');
            return;
        }
        try {
            const backupPath = path.join(DATABASE_DIR, backupFile);
            fs.copyFileSync(this.filename, backupPath);
             if (this.enableLog) logger.info(`Database backed up to '${backupFile}'.`);
        } catch (err) {
              console.error('Failed to backup database. Check permissions.');
            throw err;
        }
    }

    restoreDb(backupFile) {
        if (!backupFile || typeof backupFile !== 'string' || backupFile.trim() === '') {
             console.error('Invalid backup file name, provide a non-empty string.');
            return;
        }
        try {
            const backupPath = path.join(DATABASE_DIR, backupFile);
            fs.copyFileSync(backupPath, this.filename);
            this._loadDb();
            if (this.enableLog) logger.info(`Database restored from '${backupFile}'.`);
        } catch (err) {
            console.error('Failed to restore database. Check permissions.');
            throw err;
        }
    }

    setRegex(key, regexPattern) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
             console.error('Invalid key, provide a non-empty string.');
            return;
        }
        if (!regexPattern || typeof regexPattern !== 'string' || regexPattern.trim() === '') {
            console.error('Invalid regex pattern, provide a non-empty string.');
            return;
        }
        if (!this.db._regex) {
             this.db._regex = {};
        }
        this.db._regex[key] = regexPattern;
        this._saveDb();
        if (this.enableLog) logger.info(`Regex "${regexPattern}" set for key "${key}".`);
    }


    _validateWithRegex(key, value) {
        if (this.db._regex && this.db._regex[key]) {
            const regex = new RegExp(this.db._regex[key]);
            if (!regex.test(value)) {
                 console.error(`Value "${value}" does not match the regex for key "${key}".`);
                throw new Error(`Validation Error: Value "${value}" does not match the regex for key "${key}".`);
            }
        }
    }

    validateData(data) {
        if (typeof data === 'object' && data !== null) {
            for (const [key, value] of Object.entries(data)) {
                this._validateWithRegex(key, value);
            }
            return true;
        }
        return false
    }

    showDb() {
        return this.db;
    }

    convertToDateTime(key) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
             console.error('Invalid key, provide a non-empty string.');
            return null;
        }
        const data = this.getData(key);
        if (data) {
            return utils.convertToDateTime(data);
        } else {
            console.error(`Key '${key}' not found. Cannot convert to datetime.`);
            return null;
        }
    }

    flattenJson(key) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
           console.error('Invalid key, provide a non-empty string.');
            return null;
        }
        const data = this.getData(key);
        if (data) {
            return utils.flattenJSON(data);
        } else {
              console.error(`Key '${key}' not found. Cannot flatten JSON.`);
            return null;
        }
    }

    // Exported utility functions
    hashPassword = utils.hashPassword;
    checkPassword = utils.checkPassword;
    getOrDefault = utils.getOrDefault;
    keyExistsOrAdd = utils.keyExistsOrAdd;
    searchData = utils.searchData;
    sanitizeOutput = utils.sanitizeOutput;
    prettyPrint = utils.prettyPrint;
}

module.exports = JsonDB;