const JsonDB = require('../src/litejsondb');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

  if(type === 'error') {
    console.error(`\x1b[31m${logMessage}\x1b[0m`);
    return;
  }

    console.log(`\x1b[36m${logMessage}\x1b[0m`);

}

async function runTests() {
  log("Starting tests...", 'info');

    // Test with default file
    log("Test with default file...", 'info');
    const db = new JsonDB();


    // Test with encrypted file (base64)
    log("Test with encrypted file (base64)...", 'info');
    const encryptedDb = new JsonDB('encrypted_db.json', { crypted: true , secretKey: 'secret'});


    // Test with crypto method
    log("Test with encrypted file (crypto)...", 'info');
    const cryptoDb = new JsonDB('crypto_db.json', { crypted: true ,encryptionMethod: 'crypto', secretKey: '12345678901234567890123456789012'});


    // Basic operations
    log("------------------ TEST BASIC OPERATIONS --------------------", 'info')
    db.setData('users/1', { name: 'Agent', age: 30, is_active: true });
    db.setData('products/1', {name: 'Laptop', price: 1200 });
    db.setData('products/2', {name: 'Headphones', price: 200});
    await sleep(100);
    log(`Show Data: ${JSON.stringify(db.showDb())}`, 'info');
    await sleep(100);
    log(`Data: ${JSON.stringify(db.getData('users/1'))}`, 'info');
    await sleep(100);
    db.editData('users/1', { name: 'Agent Updated', city: 'New York' });
    log(`Edit data: ${JSON.stringify(db.getData('users/1'))}`, 'info');
    await sleep(100);
    db.deleteData('products/2');
     log(`Data after delete product: ${JSON.stringify(db.showDb())}`, 'info');
    await sleep(100);
    log(`key exists: ${db.keyExists('products/1')}`, 'info');

  //Subcollection operations
    log("------------------ TEST SUBCOLLECTIONS OPERATIONS --------------------", 'info')
    db.setSubcollection('users/1', 'address', { street: '123 Main St', city: 'Anytown' });
    await sleep(100);
    log(`sub collection : ${JSON.stringify(db.getSubcollection('users/1'))}`, 'info');
    await sleep(100);
    log(`get sub collection address : ${JSON.stringify(db.getSubcollection('users/1', 'address'))}`, 'info');
    await sleep(100);
    db.editSubcollection('users/1', 'address', { country: 'USA' });
     log(`edit sub collection address : ${JSON.stringify(db.getSubcollection('users/1', 'address'))}`, 'info');
    await sleep(100);
    db.deleteSubcollection('users/1','address')
     log(`sub collection after delete address : ${JSON.stringify(db.getSubcollection('users/1'))}`, 'info');

  // Test Backup and Restore
    log("------------------ TEST BACKUP AND RESTORE OPERATIONS --------------------", 'info')
    db.backupDb('backup.json');
     await sleep(100);
    db.setData('users/2', { name: 'Agent 2', age: 22 });
     log(`DB AFTER BACKUP: ${JSON.stringify(db.showDb())}`, 'info')
    await sleep(100);
    db.restoreDb('backup.json');
    log(`DB AFTER RESTORE: ${JSON.stringify(db.showDb())}`, 'info');

  // Test Encryption and Decryption base64 method
    log("------------------ TEST ENCRYPTION AND DECRYPTION BASE64 METHOD --------------------", 'info')
    encryptedDb.setData('users/1', { name: 'Agent Encrypted', age: 30, is_active: true });
    await sleep(100);
    log(`Encrypted Data: ${JSON.stringify(encryptedDb.getData('users/1'))}`, 'info');
    await sleep(100);
    encryptedDb.editData('users/1',{is_active: false})
    log(`Encrypted Data after edit: ${JSON.stringify(encryptedDb.getData('users/1'))}`, 'info');
    await sleep(100);
     log(`Encrypted DB :${JSON.stringify(encryptedDb.showDb())}`, 'info')

    // Test Encryption and Decryption crypto method
    log("------------------ TEST ENCRYPTION AND DECRYPTION CRYPTO METHOD --------------------", 'info')
    cryptoDb.setData('users/1', { name: 'Agent crypto', age: 30, is_active: true });
     await sleep(100);
     log(`Crypto Data: ${JSON.stringify(cryptoDb.getData('users/1'))}`, 'info');
    await sleep(100);
     cryptoDb.editData('users/1',{is_active: false})
    log(`Crypto Data after edit: ${JSON.stringify(cryptoDb.getData('users/1'))}`, 'info');
     await sleep(100);
     log(`Crypto DB: ${JSON.stringify(cryptoDb.showDb())}`, 'info');

  // Test Regex validation
    log("------------------ TEST REGEX VALIDATION --------------------", 'info')
    db.setRegex('age', '^[0-9]+$')
    log(`REGEX: ${JSON.stringify(db.showDb())}`, 'info');
    try{
        db.setData('users/3', { name: 'Agent 3', age: 'invalid' });
    } catch(err) {
        log(`Error validation user 3 : ${err.message}`, 'error')
    }
    try{
        db.editData('users/1',{age:'20'})
        db.validateData({age:'invalid'})
    } catch (err) {
        log(`Error validation users 1 : ${err.message}`, 'error')
    }

    // Test convert to datetime
    log("------------------ TEST CONVERT TO DATETIME --------------------", 'info')
    db.setData('date', new Date().getTime())
     log(`date to string : ${db.convertToDateTime('date')}`, 'info');

  // Test flatten json
    log("------------------ TEST FLATTEN JSON --------------------", 'info')
    db.setData('settings',{theme: {color: 'dark', size: 'large'},notifications:{email: true, sms:false}})
     log(`flatten json : ${JSON.stringify(db.flattenJson('settings'))}`, 'info');
     log(`all json : ${JSON.stringify(db.flattenJson(''))}`, 'info');


  // Test search data
    log("------------------ TEST SEARCH DATA --------------------", 'info')
    db.setData('search',{a: 1, b: {c: 2, d: {e: 3, f: 4}}})
    log(`search number 3 : ${JSON.stringify(db.searchData(db.showDb(), 3))}`, 'info');
    log(`search number 3 with path  : ${JSON.stringify(db.searchData(db.showDb(),3,'b/d'))}`, 'info');


    log("------------------ TEST UTILITY FUNCTIONS --------------------", 'info')
    log(`hash password: ${db.hashPassword('password123')}`, 'info');
     log(`check password: ${db.checkPassword(db.hashPassword('password123'),'password123')}`, 'info');
     log(`key exists or add: ${db.keyExistsOrAdd(db.showDb(),'exist', 'default')}`, 'info')
     log(`get or default : ${db.getOrDefault(db.showDb(),'users','no user')}`, 'info');
     log(`sanitize output : ${db.sanitizeOutput({test:1})}`, 'info');
     log(`pretty print :`, 'info')
     db.prettyPrint({test:1})


     log("All tests completed.", 'info');

}

runTests();