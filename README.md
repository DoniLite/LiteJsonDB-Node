# 📚 LiteJsonDB Documentation

**LiteJsonDB** is a lightweight local JSON database for Node.js, designed to simplify JSON data management in your projects. This package is a fork of the Python [LiteJsonDB](https://github.com/codingtuto/LiteJsonDb/) project, adapted for Node.js. Currently, this project is about 45% complete, meaning it's already super functional but still has room for more cool features.

> LiteJsonDB is like a nifty little vault for your JSON data. It provides a simple and intuitive API for adding, modifying, retrieving, and deleting data. You don't need to worry about the complexities of heavier database systems. With LiteJsonDB, you can focus on what really matters: your data.

## 📋 Table of Contents

1.  [Installation](#-installation)
2.  [Usage](#-usage)
    *   [Initialization](#-initialization)
    *   [Adding Data](#-adding-data)
    *   [Editing Data](#-editing-data)
    *   [Getting Data](#-getting-data)
    *   [Deleting Data](#-deleting-data)
    *   [Searching Data](#-searching-data)
    *   [Managing Subcollections](#-managing-subcollections)
    *   [Backup and Restore](#-backup-and-restore)
    *   [Regex Validation](#-regex-validation)
    *   [Additional Features](#-additional-features)
3.  [Utility Functions](#-utility-functions)
4.  [Example Code](#-example-code)
5.  [Future Development](#-future-development)
6.  [Contribution](#-contribution)

## 🔧 Installation

To get started with LiteJsonDB, you need to install it via npm. It's super easy! Just run the following command in your terminal:

<pre><code>
npm install litejsondb-node
</code></pre>

## 🎯 Usage

### 🏁 Initialization

Once installed, you can import `JsonDB` and initialize your database like this:

<pre><code>
const JsonDB = require('litejsondb-node');

// Initialize a basic database
const db = new JsonDB();

// Initialize with a specific filename
const dbWithFilename = new JsonDB('my_database.json');

// Initialize with options
const dbWithOptions = new JsonDB('my_database.json', {
    crypted: true, // Enables data encryption with base64 (default)
    encryptionMethod: 'crypto', // Specify the encryption method ('base64', 'crypto'). If crypted = true, the default method will be base64.
    secretKey: '12345678901234567890123456789012', // Secret key for encryption (required if crypted is true and encryptionMethod is 'crypto') must be 32-byte
    enableLog: true, // Enables logging to file `LiteJsonDb.log` in `database` directory
    autoBackup: true, // Enables automatic backup of the database before save
});

// If you want only crypted
const cryptedDb = new JsonDB('crypted_db.json',{crypted:true,secretKey: 'secret'});
</code></pre>
**Options Description**:

*   **`filename`**: *(Optional)* A `string` representing the name of the JSON file used for storing the database. If no filename is provided, the default name is `database.json` is used. The file is located in `database` directory.
*   **`crypted`**: *(Optional)* A `boolean` indicating whether the database should be encrypted or not. Default to `false`.
*   **`encryptionMethod`**: *(Optional)* A `string` representing the method used for encryption, can be `base64` or `crypto`. If `crypted` is `true` and you don't provide an encryption method, the default will be 'base64'.
*   **`secretKey`**: *(Optional)* A `string` representing the secret key used for encryption. Required if `crypted` is `true` and `encryptionMethod` is set to `crypto`. Must be a 32-byte string.
*   **`enableLog`**: *(Optional)* A `boolean` indicating whether to log database operations. Default to `true`. Logs are saved in `database/LiteJsonDb.log`.
*   **`autoBackup`**: *(Optional)* A `boolean` indicating if auto backup is enabled. Default to `false`.

### 📥 Adding Data

Adding data is a breeze with LiteJsonDB. Use the `setData` method to store information in the database:

<pre><code>
db.setData('users/1', { name: 'Aliou', age: 30 });
db.setData('products/1', { name: 'Laptop', price: 999.99 });
</code></pre>

**Explanation**:

*   **Key/Value Storage:** Use the `setData(key, value)` method to store your data in the database. The data is stored as a JSON object.
*   **Data Format**: The `value` must be an `object`, other types are not supported.
*   **Key Structure**: The `key` is a string representing the path for the new entry. The path is created recursively if it does not exist. If the `key` already exists, the data is not added, you should use `editData` to modify it.

### 🔄 Editing Data

To update existing data, use `editData`. You can modify information without erasing what’s already there:

<pre><code>
db.editData('users/1', { age: 31 });
db.editData('products/1', {price: 1200})
</code></pre>

**Explanation**:

*   **Merging Objects**: The `editData(key, value)` method merges existing data at the given path with the new data you provide.
*   **Key Path**: The `key` is a string representing the path for the entry to be edited.
*   **Value Format**: The `value` must be an object. Non-object types are not supported.
*   **Key Check**: If the `key` doesn't exists an error will be returned. You should use `setData` to create a new entry.

### 📜 Getting Data

The `getData` method allows you to retrieve data from the database. You can specify the exact path of the data you want to access. Here’s how you can use it:

<pre><code>
console.log('User 1:', db.getData('users/1'));
console.log('Product 1:', db.getData('products/1'));
</code></pre>

**Explanation**:

*   **Path Specification**: You use a key path like `'users/1'` or `'products/1'` to retrieve specific entries from the database. The key path is a string that denotes the location of the data in the hierarchical structure of the database.
*   **Default Behavior**: If the specified path does not exist, `getData` will return `null`. Ensure you handle such cases in your code to avoid errors.
*   **Data Format:** The returned data will be the value of the key or subcollection.

### ❌ Deleting Data

Need to delete data? No problem! The `deleteData` method allows you to remove specific information. You have two options:

1.  **Delete Specific Entry**: If you want to delete a specific entry, provide the exact key path:

    <pre><code>
    db.deleteData('products/1');
    </code></pre>

    This command will remove only the data located at `'products/1'`, leaving other data intact.

2.  **Delete All Data Under a Path**: If you want to delete all data under a specific key path, you can use a nested key path:

    <pre><code>
    db.deleteData('products');
    </code></pre>

    This will remove the entire `'products'` section, including all entries within it, such as `'products/1'` and any other nested products.

**Explanation**:

*   **Specific Entry Deletion**: By providing a precise path like `'products/1'`, you delete only that particular entry.
*   **Path-Wide Deletion**: Using a broader path like `'products'` deletes everything under that path. This is useful for clearing out all related data but should be used carefully to avoid unintentional data loss.
*   **Key Check:** An error is returned if the specified path does not exist.

### 🔍 Searching Data

You can also search your data with `searchData`. This helps you find specific values anywhere in the database:

<pre><code>
const searchResults = db.searchData(db.showDb(), 'Aliou');
const searchResultsWithPath = db.searchData(db.showDb(), 30, 'users/1');
console.log(searchResults);
console.log(searchResultsWithPath);
</code></pre>

**Explanation:**

*   **Search Value**: The `searchData(data, searchValue, key)` searches for the `searchValue` in the `data`.
*   **Data**: The first parameter `data` is the dataset to be searched, `db.showDb()` for the entire database or `db.getData('your/path')` for a specific data part.
*   **Key**: The third parameter `key` is optional, if provided the search will be done only in the given path.
*   **Return**: The method will return the matching values in `object` with the path as the key.
*   **Not Found**: If no matches found an error will be displayed.

### 📦 Managing Subcollections

You can use `setSubcollection`, `editSubcollection` and `getSubcollection` methods to handle nested objects

*   **`setSubcollection(parentKey, subcollectionKey, subcollectionData)`:** This allows you to add or update a sub-collection within a specified parent key
    <pre><code>
    db.setSubcollection('users/1', 'address', { street: '123 Main St', city: 'Anytown' });
    </code></pre>
*   **`editSubcollection(parentKey, subcollectionKey, subcollectionData)`:** This allows you to update an existing sub-collection within a specified parent key

    <pre><code>
    db.editSubcollection('users/1', 'address', { country: 'USA' });
    </code></pre>
*   **`getSubcollection(parentKey, subcollectionKey)`:** You can use this to retrieve either the entire subcollection or a specific part of it

    <pre><code>
    console.log('sub collection address : ', db.getSubcollection('users/1', 'address'));
    console.log('sub collections user 1 : ', db.getSubcollection('users/1'));
    </code></pre>
*   **`deleteSubcollection(parentKey, subcollectionKey)`:** Use this method to remove a specific sub-collection.

    <pre><code>
    db.deleteSubcollection('users/1','address')
    </code></pre>

### 💾 Backup and Restore

LiteJsonDB provides functions for backing up and restoring the database:

*   **`backupDb(backupFile)`**: Creates a backup of the database to the specified `backupFile` in the `database` directory.

    <pre><code>
    db.backupDb('backup.json')
    </code></pre>
*   **`restoreDb(backupFile)`**: Restores the database from the specified `backupFile`.
    <pre><code>
    db.restoreDb('backup.json')
    </code></pre>

### 🛡️ Regex Validation

You can use `setRegex` to set a regex for the value of an entry and `validateData` to check if the values respect the regex that is previously set using `setRegex` :

*   **`setRegex(key, regexPattern)`**: Allows you to define a regex pattern for a value of given `key`
    <pre><code>
    db.setRegex('age', '^[0-9]+$');
    </code></pre>

*   **`validateData(data)`**: Allows you to check if the data is valid according to the defined regex.

    <pre><code>
    db.validateData({age:22})
    </code></pre>
    *   If a value does not respect the regex pattern an error will be returned.

### ✨ Additional Features

*   **`showDb()`**: Returns the entire database object.

    <pre><code>
       console.log(db.showDb());
    </code></pre>
*   **`convertToDateTime(key)`**: Converts a timestamp to a date time string.
    <pre><code>
        db.setData('date', new Date().getTime())
        console.log(db.convertToDateTime('date'))
    </code></pre>
    *   If the `key` doesn't exists or isn't valid a `null` value will be returned.

*   **`flattenJson(key)`:** Flattens a nested JSON object to a one-level object

    <pre><code>
        db.setData('settings',{theme: {color: 'dark', size: 'large'},notifications:{email: true, sms:false}})
        console.log(db.flattenJson('settings'));
        console.log(db.flattenJson(''));
    </code></pre>
    *   If `key` is empty, it will flatten the entire database
    *   If the `key` doesn't exists or isn't valid a `null` value will be returned.

*   **`keyExists(key)`:** Used to check if the key exists or not

    <pre><code>
        console.log("key exists:", db.keyExists('products/1'))
    </code></pre>

## 🛠️ Utility Functions

LiteJsonDB includes some handy utility functions:

*   **`hashPassword(password)`**: Hashes the given password using SHA256.
*   **`checkPassword(storedHash, password)`**: Checks if the given password matches the stored hash.
*   **`getOrDefault(data, key, defaultValue)`**: Returns the value for the key if it exists in the `data`, or the `defaultValue` if the key doesn't exist.
*   **`keyExistsOrAdd(data, key, defaultValue)`**: Checks if the given `key` exists in the `data` and returns `true`. If not, it adds the key with the specified `defaultValue` and returns `false`.
*   **`searchData(data, searchValue, key)`**: Searches for the `searchValue` in the provided `data`, and return the matches if it found. The `key` is optional, if it's provided the search will be done only in the given path
*   **`sanitizeOutput(data)`**: Returns a stringified JSON with a pretty print format.
*   **`prettyPrint(data)`**: Prints a pretty format of the JSON object.

Here’s how you can use them:

<pre><code>
const hashedPassword = db.hashPassword('myPassword123');
const isPasswordValid = db.checkPassword(hashedPassword, 'myPassword123');
const defaultValue = db.getOrDefault({test: 1}, 'country', 'Unknown');
const keyExists = db.keyExistsOrAdd({test:1}, 'country', 'Unknown');
const searchResult = db.searchData({test:1, test2: 'test'}, 'test');
const output = db.sanitizeOutput({test: 1});
db.prettyPrint({test: 1});
</code></pre>

## 📖 Example Code

Here’s a small example to show you how everything works together:

<pre><code>
const JsonDB = require('litejsondb-node');
const db = new JsonDB();

// Set initial data
db.setData('users/1', { name: 'Aliou', age: 30 });
db.setData('products/1', { name: 'Laptop', price: 999.99 });

// Edit data
db.editData('users/1', { age: 31 });

// Get data
console.log('User 1:', db.getData('users/1'));
console.log('Product 1:', db.getData('products/1'));

// Delete Data
db.deleteData('products/1');

// Show the entire database content
console.log('Database Content:', db.showDb());

// Backup and restore the database
db.backupDb('backup.json');
db.restoreDb('backup.json');
</code></pre>

## 🛠️ Future Development

**LiteJsonDB** is a fork of our Python [LiteJsonDB](https://github.com/codingtuto/LiteJsonDb/) package. I’ve managed to reproduce about 45% of the work so far, and it's already functional with features like adding, editing, and deleting data. However, there’s still a lot to be done!

If you have skills in both Node.js and Python, you might want to dive into the code and contribute to the Node.js project. Currently, I’m focused more on Python development and may not have enough time to add all the desired features to this package.

Your contributions could help move the project forward and make it even better. Feel free to explore the code and get involved!

## 💬 Contribution

If you want to contribute to the project, feel free to open issues or pull requests. Every contribution is welcome to help make this project even better!