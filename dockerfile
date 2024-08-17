# Use lightweight linux
FROM alpine:3.20

RUN apk --no-cache upgrade
RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY . .

RUN npm install

# Compile frontend
WORKDIR /app/client
RUN npm install
RUN npm run build

# Expose port
EXPOSE 443

# Start the app
WORKDIR /app
CMD ["npm", "run", "start"]