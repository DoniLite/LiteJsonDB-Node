import JsonDB, { StoreData } from 'litejsondb';
import { expectAssignable, expectType } from 'tsd';

const db = new JsonDB();


db.setData('users', {
  user: 'djony',
  password: 'malick',
  data: { age: 2, subName: 'Doni' },
});
const user = db.getData('users');
user.me
db.setData('users', ['Karl', 2]);
db.setSubcollection('users', 'subUsers', { yes: true });
db.deleteSubcollection('users', 'subUsers'); 
db.validateData({me: 'admin'});
db.validateData('yo');
db.getOrDefault({user: 'admin'}, 'users', { yes: true });
db.searchData({user: 'admin', yes: true}, { yes: true}, 'yes');
