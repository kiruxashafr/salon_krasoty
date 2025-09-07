

const bcrypt = require('bcrypt');

// Генерация хеша пароля (выполнить один раз для установки пароля)
// const saltRounds = 10;
// const plainPassword = 'ваш_секретный_пароль';
// bcrypt.hash(plainPassword, saltRounds).then(hash => {
//     console.log('Хеш пароля:', hash);
// });

// Экспортируем хеш пароля (заменить на сгенерированный хеш)
module.exports = {
    PASSWORD_HASH: '$2b$10$v.R6.IrecuSEsfVKI157QeCGa9aGvHz8WjTGdl5z4tUhg.PDhe8Oe' // Пример хеша
};