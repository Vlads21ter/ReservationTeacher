# Вказуємо базовий образ з Node.js
FROM node:22

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json до робочої директорії
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

RUN npm install body-parser

RUN npm install ejs

RUN npm install express

RUN npm install googleapis

RUN npm install mongodb

RUN npm install express-session

# Копіюємо всі файли проекту до робочої директорії
COPY . .

# Вказуємо порт, який буде використовуватись вашим додатком
EXPOSE 3000

# Команда для запуску вашого додатка
CMD ["node", "index.js"]