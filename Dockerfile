# 1. Use an official Node.js setup
FROM node:20-slim

# 2. Install Google Chrome using the updated, correct method
RUN apt-get update && apt-get install -y wget gnupg ca-certificates --no-install-recommends \
    && mkdir -p /etc/apt/keyrings \
    && wget -q -O- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
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
