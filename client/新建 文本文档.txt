FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci || npm i
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
# simple nginx config
RUN printf 'server { listen 3000; root /usr/share/nginx/html; index index.html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
CMD ["nginx","-g","daemon off;"]
