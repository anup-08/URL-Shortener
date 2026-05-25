# 🚀 URL Shortener (Spring Boot + Redis)

A scalable and production-oriented **URL Shortener service** built using **Spring Boot, MySQL, and Redis**.  
This project demonstrates real-world backend engineering concepts like caching, rate limiting, and asynchronous processing.

---

## ✨ Features

- 🔗 **Short URL Generation**
  - Base62 encoding for compact and unique short links

- ⚡ **Fast Redirects (Redis Caching)**
  - Cache-aside pattern using Redis
  - Reduces database load and improves latency

- 📊 **Click Tracking (Optimized)**
  - Uses Redis atomic counters (`INCR`)
  - Scheduled batch updates to MySQL for scalability

- 🚫 **Rate Limiting**
  - Prevents abuse using Redis-based fixed window strategy
  - Configurable via `application.yml`

- 🧹 **Cache Invalidation**
  - Proper deletion of related cache keys (`url`, `status`, `click`)

- 🧠 **Production-Level Design**
  - Separation of concerns (Controller, Service, Repository)
  - Efficient DB access using batch updates (JDBC)

---

## 🏗️ Architecture 

- Client Request
  - ↓
- Rate Limiter (Redis)
  - ↓
- Cache (Redis)
  - ↓
- Database (MySQL)
  - ↓
- Scheduled Job → Batch Update Click Count

---

## 🛠️ Tech Stack

- **Backend:** Spring Boot  
- **Database:** MySQL  
- **Cache:** Redis  
- **Build Tool:** Maven  
- **Other:** Docker (for Redis)

---

## ⚙️ Configuration

### 🔹 application.yml

```yaml
spring:
  datasource:
    url: ${db_url}
    username: ${db_user}
    password: ${db_password}

  data:
    redis:
      host: ${redis_host}
      port: ${redis_port}

rate-limit:
  requests: 100
  duration: 60
```
## ▶️ Getting Started
### 1️⃣ Clone the repository
```
git clone https://github.com/your-username/url-shortener.git
cd url-shortener
```
### 2️⃣ Run Redis (Docker)
```
docker run -d -p 6379:6379 redis
```
### 3️⃣ Set Environment Variables
```
db_url=jdbc:mysql://localhost:3306/urlshortener
db_user=root
db_password=your_password
redis_host=localhost
redis_port=6379
```
## 📡 API Endpoints
### 🔹 Create Short URL
```
POST /api/url
```
### 🔹 Redirect to Original URL
```
GET /api/url/{shortUrl}
```
### 🔹 Get URL Stats
```
GET /api/url/status/{shortUrl}
```
### 🔹 Delete URL
```
DELETE /api/url/{shortUrl}
```
## ⚡ Performance Optimizations

- 🚀 Eliminated DB calls on redirect using Redis cache
- 📉 Reduced DB writes using Redis counters + batch updates
- ⚡ Atomic operations using Redis (INCR, GETDEL)
- 🔁 Asynchronous processing using scheduled jobs

## 🔐 Rate Limiting Strategy
- Fixed window rate limiting using Redis
- Key format: rate:<ip+shortUrl>
- Prevents excessive requests per time window
