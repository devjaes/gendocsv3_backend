FROM node:20.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y tzdata \
    python3 \
    python3-pip \
    build-essential \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=America/Bogota
RUN cp /usr/share/zoneinfo/America/Bogota /etc/localtime

RUN ln -s /usr/bin/python3 /usr/bin/python

# Install vim
RUN apt-get update && apt-get install -y vim

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
COPY ./scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh
EXPOSE 3001
CMD ["/app/start.sh"]