# External API Documentation

เอกสารนี้สำหรับทีมภายนอกที่ต้องการเชื่อมต่อกับระบบ License Manager

## Base URL

```text
https://your-domain.com
```

ตัวอย่างในเครื่อง local:

```text
http://localhost:3000
```

## Authentication

ทุก endpoint ในเอกสารนี้ต้องส่ง token ใน header

รองรับ 2 แบบ:

1. `x-api-token` (แนะนำ, จากหน้า Admin > Settings > API Integration)
2. `x-api-key` (รองรับย้อนหลังจากค่า `API_KEY` ใน `.env`)

ตัวอย่าง header:

```http
x-api-token: YOUR_API_TOKEN
```

## Endpoints

### 1) List License Keys

`GET /api/external/licenses`

Query parameters:

- `page` (optional): default `1`
- `limit` (optional): default `50`, max `200`
- `status` (optional): เช่น `active`, `expired`, `revoked`
- `license_key` (optional): ค้นหาแบบ contains

Example request:

```bash
curl -X GET "http://localhost:3000/api/external/licenses?page=1&limit=20&status=active&license_key=POS-" \
  -H "x-api-token: YOUR_API_TOKEN"
```

Example response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "license_key": "POS-ABCD-1234-EF56-7890",
      "product_name": "POS System",
      "plan": "Basic",
      "max_activations": 1,
      "current_activations": 0,
      "status": "active",
      "expires_at": "2026-12-31T23:59:00",
      "renew_date": null,
      "sync_url": null,
      "created_by": 1,
      "created_at": "2026-03-20T10:15:00",
      "notes": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 2) Get License by ID

`GET /api/external/licenses/:id`

Example request:

```bash
curl -X GET "http://localhost:3000/api/external/licenses/1" \
  -H "x-api-token: YOUR_API_TOKEN"
```

Example response `200`:

```json
{
  "id": 1,
  "license_key": "POS-ABCD-1234-EF56-7890",
  "product_name": "POS System",
  "plan": "Basic",
  "max_activations": 1,
  "current_activations": 0,
  "status": "active",
  "expires_at": "2026-12-31T23:59:00",
  "renew_date": null,
  "sync_url": null,
  "created_by": 1,
  "created_at": "2026-03-20T10:15:00",
  "notes": null
}
```

### 3) Get License by Key

`GET /api/external/licenses/key/:key`

Example request:

```bash
curl -X GET "http://localhost:3000/api/external/licenses/key/POS-ABCD-1234-EF56-7890" \
  -H "x-api-token: YOUR_API_TOKEN"
```

Example response `200`:

```json
{
  "id": 1,
  "license_key": "POS-ABCD-1234-EF56-7890",
  "product_name": "POS System",
  "plan": "Basic",
  "max_activations": 1,
  "current_activations": 0,
  "status": "active",
  "expires_at": "2026-12-31T23:59:00",
  "renew_date": null,
  "sync_url": null,
  "created_by": 1,
  "created_at": "2026-03-20T10:15:00",
  "notes": null
}
```

### 4) Update License by ID

`PUT /api/external/licenses/:id`

Request body (ส่งเฉพาะ field ที่ต้องการแก้ไข):

- `maxActivations` (number)
- `notes` (string or null)
- `active` (boolean)
- `renew_date` (ISO datetime string)
- `expires_at` (ISO datetime string)
- `status` (`active` | `expired` | `revoked`)

Example request:

```bash
curl -X PUT "http://localhost:3000/api/external/licenses/1" \
  -H "Content-Type: application/json" \
  -H "x-api-token: YOUR_API_TOKEN" \
  -d '{
    "status": "active",
    "expires_at": "2026-12-31T23:59:00",
    "maxActivations": 5,
    "notes": "Updated by external system"
  }'
```

Example response `200`:

```json
{
  "id": 1,
  "license_key": "POS-ABCD-1234-EF56-7890",
  "product_name": "POS System",
  "plan": "Basic",
  "max_activations": 5,
  "current_activations": 0,
  "status": "active",
  "expires_at": "2026-12-31T23:59:00",
  "renew_date": null,
  "sync_url": null,
  "created_by": 1,
  "created_at": "2026-03-20T10:15:00",
  "notes": "Updated by external system"
}
```

## Error Codes

| HTTP Status | Error Message | Meaning |
|---|---|---|
| `400` | `License ID required` | ไม่ส่ง `:id` |
| `400` | `License key required` | ไม่ส่ง `:key` |
| `403` | `Invalid or missing API token` | ไม่ส่ง token หรือ token ไม่ถูกต้อง |
| `404` | `License not found` | ไม่พบข้อมูล license ตามเงื่อนไข |
| `405` | `Method not allowed` | ใช้ HTTP method ไม่ตรง endpoint |
| `500` | `Failed to fetch licenses` | ดึงรายการ licenses ไม่สำเร็จ |
| `500` | `Failed to process request` | เกิดข้อผิดพลาดภายในระบบ |

## Quick Test Checklist

1. เรียก `GET /api/external/licenses` ด้วย `x-api-token` ต้องได้ `200`
2. เปลี่ยน token เป็นค่าผิด ต้องได้ `403`
3. เรียก `GET /api/external/licenses/:id` ด้วย id ที่ไม่มี ต้องได้ `404`
4. เรียก `PUT /api/external/licenses/:id` แล้วตรวจ field ที่อัปเดตได้จริง
