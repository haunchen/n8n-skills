FROM zeabur/caddy-static

WORKDIR /usr/share/caddy

# 創建子目錄結構以支援 /n8n-skills/ 路徑
RUN mkdir -p n8n-skills

# 將網站檔案複製到子目錄
COPY website/ n8n-skills/

EXPOSE 8080
