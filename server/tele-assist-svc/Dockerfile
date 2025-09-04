# server/tele-assist-svc/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 只拷贝 package.json 先装依赖，利用缓存
COPY app/package*.json ./app/
RUN cd /app/app && npm install --omit=dev

# 再拷贝其它源代码
COPY app /app/app

EXPOSE 8300
CMD ["node", "app/index.js"]
