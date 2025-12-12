# Email API Documentation

## Overview

The AfriCom Email API allows you to send transactional and bulk emails with support for:
- **React Email** templates
- **HTML & Plain Text** emails
- **Attachments**
- **Email tracking** (opens, clicks)
- **SMTP API** access
- **Template management**
- **Email validation**
- **Analytics & reporting**

## Authentication

All API requests require an API key passed in the header:

```bash
Authorization: Bearer your-api-key-here
```

## Base URL

```
https://api.africommunications.io/api/v1/email
```

---

## 1. Send Single Email

Send a single email to one or more recipients.

### Endpoint

```http
POST /api/v1/email/send
```

### Request Body

```json
{
  "from": {
    "email": "sender@yourdomain.com",
    "name": "Your Name"
  },
  "to": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "subject": "Welcome to AfriCom!",
  "html": "<h1>Hello {{name}}</h1><p>Welcome to our platform!</p>",
  "text": "Hello {{name}}, Welcome to our platform!",
  "templateData": {
    "name": "John Doe"
  },
  "tags": ["welcome", "onboarding"],
  "metadata": {
    "userId": "user_123"
  }
}
```

### Example with cURL

```bash
curl -X POST https://api.africommunications.io/api/v1/email/send \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome!",
    "html": "<h1>Welcome to AfriCom</h1>"
  }'
```

### Response

```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "id": "email_abc123",
    "status": "sent",
    "to": ["user@example.com"],
    "from": "noreply@yourdomain.com",
    "subject": "Welcome!",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 2. Send with Template

Send an email using a pre-created template.

```json
{
  "from": "noreply@yourdomain.com",
  "to": ["user@example.com"],
  "subject": "Welcome!",
  "templateId": "template_xyz789",
  "templateData": {
    "name": "John Doe",
    "verificationUrl": "https://yourdomain.com/verify/abc123"
  }
}
```

---

## 3. Send with Attachments

```json
{
  "from": "billing@yourdomain.com",
  "to": ["customer@example.com"],
  "subject": "Your Invoice",
  "html": "<p>Please find your invoice attached.</p>",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "base64-encoded-content-here",
      "contentType": "application/pdf",
      "encoding": "base64"
    }
  ]
}
```

---

## 4. Send Bulk Emails

Send emails to multiple recipients with personalized content.

### Endpoint

```http
POST /api/v1/email/bulk/send
```

### Request Body

```json
{
  "from": "newsletter@yourdomain.com",
  "recipients": [
    {
      "to": ["user1@example.com"],
      "templateData": {
        "name": "Alice",
        "offer": "20% off"
      }
    },
    {
      "to": ["user2@example.com"],
      "templateData": {
        "name": "Bob",
        "offer": "15% off"
      }
    }
  ],
  "subject": "Special Offer for {{name}}",
  "templateId": "template_offer123",
  "batchSize": 50
}
```

### Response

```json
{
  "success": true,
  "message": "Bulk emails queued successfully",
  "data": {
    "batchId": "batch_xyz789",
    "totalEmails": 2,
    "queued": 2,
    "failed": 0,
    "emails": [...]
  }
}
```

---

## 5. Get Email Status

Track the delivery status of an email.

### Endpoint

```http
GET /api/v1/email/:id/status
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "email_abc123",
    "status": "delivered",
    "to": ["user@example.com"],
    "from": "noreply@yourdomain.com",
    "subject": "Welcome!",
    "sentAt": "2024-01-15T10:30:00Z",
    "deliveredAt": "2024-01-15T10:30:15Z",
    "openedAt": "2024-01-15T11:00:00Z",
    "clickedAt": "2024-01-15T11:05:00Z",
    "events": [
      {
        "type": "sent",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "type": "delivered",
        "timestamp": "2024-01-15T10:30:15Z"
      },
      {
        "type": "opened",
        "timestamp": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

---

## 6. Email Templates

### Create Template

```http
POST /api/v1/email/templates
```

```json
{
  "name": "Welcome Email",
  "subject": "Welcome to {{companyName}}!",
  "htmlContent": "<h1>Welcome {{userName}}!</h1>",
  "textContent": "Welcome {{userName}}!",
  "variables": ["companyName", "userName"],
  "category": "transactional"
}
```

### List Templates

```http
GET /api/v1/email/templates
```

### Get Template

```http
GET /api/v1/email/templates/:id
```

### Update Template

```http
PUT /api/v1/email/templates/:id
```

### Delete Template

```http
DELETE /api/v1/email/templates/:id
```

---

## 7. React Email Support

### Create React Email Template

```json
{
  "name": "Modern Welcome Email",
  "subject": "Welcome to AfriCom!",
  "htmlContent": "",
  "reactTemplate": "
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components';

const Component = ({ name, verificationUrl }) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f6f9fc' }}>
      <Container>
        <Heading>Welcome {name}!</Heading>
        <Text>Thank you for joining us.</Text>
        <Button href={verificationUrl}>Verify Email</Button>
      </Container>
    </Body>
  </Html>
);

export default Component;
  ",
  "variables": ["name", "verificationUrl"]
}
```

### Render React Email Preview

```http
POST /api/v1/email/render
```

```json
{
  "templateId": "template_react123",
  "props": {
    "name": "John Doe",
    "verificationUrl": "https://yourdomain.com/verify/abc123"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "html": "<html>...rendered HTML...</html>"
  }
}
```

---

## 8. Email Validation

Validate email addresses before sending.

### Endpoint

```http
POST /api/v1/email/validate
```

### Request

```json
{
  "emails": [
    "valid@example.com",
    "invalid@invalid-domain.com",
    "disposable@tempmail.com"
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "email": "valid@example.com",
        "valid": true,
        "formatValid": true,
        "domainExists": true,
        "mxRecords": ["mx1.example.com"]
      },
      {
        "email": "invalid@invalid-domain.com",
        "valid": false,
        "formatValid": true,
        "domainExists": false,
        "reason": "Domain does not exist"
      },
      {
        "email": "disposable@tempmail.com",
        "valid": false,
        "formatValid": true,
        "domainExists": true,
        "disposable": true,
        "reason": "Disposable email address"
      }
    ]
  }
}
```

---

## 9. Email Analytics

Get detailed analytics about your email campaigns.

### Endpoint

```http
GET /api/v1/email/analytics?from=2024-01-01&to=2024-01-31
```

### Response

```json
{
  "success": true,
  "data": {
    "totalSent": 10000,
    "totalDelivered": 9500,
    "totalBounced": 300,
    "totalOpened": 4500,
    "totalClicked": 1200,
    "totalComplained": 10,
    "deliveryRate": 95.0,
    "openRate": 47.37,
    "clickRate": 26.67,
    "bounceRate": 3.0,
    "complaintRate": 0.11
  }
}
```

---

## 10. SMTP Configuration

### Get SMTP Credentials

```http
GET /api/v1/email/smtp/credentials
```

### Response

```json
{
  "success": true,
  "data": {
    "host": "smtp.africommunications.io",
    "port": 587,
    "secure": false,
    "username": "your-account@africommunications.io",
    "password": "****** (Use API key as password)"
  }
}
```

### Using SMTP with Nodemailer

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.africommunications.io',
  port: 587,
  secure: false,
  auth: {
    user: 'your-account@africommunications.io',
    pass: 'your-api-key-here'
  }
});

await transporter.sendMail({
  from: 'sender@yourdomain.com',
  to: 'recipient@example.com',
  subject: 'Hello from SMTP',
  html: '<h1>Hello World!</h1>'
});
```

---

## 11. Code Examples

### Node.js / TypeScript

```typescript
import axios from 'axios';

const API_KEY = 'your-api-key';
const BASE_URL = 'https://api.africommunications.io/api/v1';

async function sendEmail() {
  const response = await axios.post(
    `${BASE_URL}/email/send`,
    {
      from: 'sender@yourdomain.com',
      to: ['recipient@example.com'],
      subject: 'Test Email',
      html: '<h1>Hello from AfriCom!</h1>',
    },
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('Email sent:', response.data);
}
```

### Python

```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://api.africommunications.io/api/v1'

def send_email():
    response = requests.post(
        f'{BASE_URL}/email/send',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'from': 'sender@yourdomain.com',
            'to': ['recipient@example.com'],
            'subject': 'Test Email',
            'html': '<h1>Hello from AfriCom!</h1>',
        }
    )
    
    print('Email sent:', response.json())
```

### PHP

```php
<?php
$apiKey = 'your-api-key';
$baseUrl = 'https://api.africommunications.io/api/v1';

$data = [
    'from' => 'sender@yourdomain.com',
    'to' => ['recipient@example.com'],
    'subject' => 'Test Email',
    'html' => '<h1>Hello from AfriCom!</h1>',
];

$ch = curl_init("$baseUrl/email/send");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo "Email sent: $response\n";
?>
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid email format | Email address format is invalid |
| 400 | Missing required field | Required field missing from request |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Insufficient balance | Not enough credits to send email |
| 404 | Email not found | Email ID does not exist |
| 404 | Template not found | Template ID does not exist |
| 429 | Rate limit exceeded | Too many requests |
| 500 | Internal server error | Server error occurred |

---

## Rate Limits

- **100 requests per minute** per API key
- **10,000 emails per day** (default, upgradable)
- **50 recipients per email** (default)
- **10MB per attachment**
- **25MB total email size**

---

## Best Practices

1. **Use Templates**: Create reusable templates for common emails
2. **Validate Emails**: Always validate recipient emails before sending
3. **Handle Bounces**: Monitor bounce rates and remove invalid addresses
4. **Add Unsubscribe**: Include unsubscribe links in marketing emails
5. **Test First**: Use the render endpoint to preview emails
6. **Monitor Analytics**: Track opens and clicks to optimize campaigns
7. **Use Tags**: Tag emails for better organization and filtering
8. **Batch Processing**: Use bulk endpoints for multiple emails
9. **Handle Errors**: Implement proper error handling and retries
10. **Authenticate Domain**: Set up SPF, DKIM, and DMARC records

---

## Support

- **Email**: support@africommunications.io
- **Documentation**: https://docs.africommunications.io
- **Status**: https://status.africommunications.io