# 1. Use an official Node.js setup
FROM node:20-slim

# 2. Tell the system to install Google Chrome automatically
RUN apt-get update && apt-get install -y wget gnupg --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-liberation --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Copy your code into this mini-computer
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 4. Tell Puppeteer WHERE Chrome is located
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# 5. Start your app
EXPOSE 3000
CMD ["node", "server.js"]
