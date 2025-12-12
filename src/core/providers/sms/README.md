# 📡 SMS Provider System

Intelligent SMS routing system supporting multiple providers across Africa.

## 🌍 Supported Providers

### 1. **Kairos** (Ghana) - ✅ **ACTIVE**
- **Countries**: Ghana 🇬🇭
- **Networks**: MTN, Vodafone, AirtelTigo
- **Priority**: 1 (Highest)
- **Status**: ✅ Fully implemented with `@kairosafrika/sms` package

**Features:**
- Direct Ghana network integration
- Real-time delivery reports
- Balance checking
- Sender ID validation

### 2. **Africa's Talking** - 🚧 **PLACEHOLDER**
- **Countries**: 30+ African countries
- **Coverage**: Kenya, Uganda, Tanzania, Rwanda, Nigeria, Ghana, South Africa, etc.
- **Priority**: 2
- **Status**: 🚧 Placeholder - Ready for implementation

**Implementation needed:**
```typescript
// Install: npm install africastalking
const AT = require('africastalking')({
  apiKey: credentials.apiKey,
  username: credentials.username
});
```

### 3. **MTN Direct** - 🚧 **PLACEHOLDER**
- **Countries**: Ghana, Nigeria, South Africa, Uganda, Rwanda, etc.
- **Networks**: MTN only
- **Priority**: 3
- **Status**: 🚧 Placeholder - Ready for implementation

### 4. **Twilio** (Global Fallback) - 🚧 **PLACEHOLDER**
- **Countries**: Global (180+ countries)
- **Priority**: 10 (Lowest - Fallback)
- **Status**: 🚧 Placeholder - Ready for implementation

**Implementation needed:**
```typescript
// Install: npm install twilio
const twilio = require('twilio');
const client = twilio(accountSid, authToken);
```

## 🏗️ Architecture

### **Provider Base Class**
All providers extend `BaseSMSProvider`:

```typescript
abstract class BaseSMSProvider {
  abstract sendSMS(options: SendSMSOptions): Promise<ProviderResponse>;
  abstract getDeliveryStatus(externalId: string): Promise<DeliveryStatus>;
  abstract checkBalance(): Promise<ProviderBalance>;
}
```

### **Provider Factory**
Manages provider initialization and retrieval:

```typescript
// Initialize all providers
await SMSProviderFactory.initializeProviders();

// Get specific provider
const kairos = SMSProviderFactory.getProvider('kairos');

// Get providers for country
const ghProviders = SMSProviderFactory.getProvidersForCountry('GH');
```

### **Provider Router**
Intelligently routes SMS to best provider:

```typescript
// Route and send
const response = await SMSProviderRouter.sendSMS(
  {
    recipient: '+233244123456',
    message: 'Hello Ghana!',
    senderId: 'MyApp',
  },
  'GH', // Country
  'mtn' // Network (optional)
);
```

## 🔧 Configuration

### Environment Variables

```env
# Kairos (Ghana)
TELECEL_API_KEY=your_kairos_api_key
TELECEL_API_SECRET=your_kairos_api_secret

# Africa's Talking
AFRICASTALKING_API_KEY=your_at_api_key
AFRICASTALKING_USERNAME=your_at_username

# MTN
MTN_API_KEY=your_mtn_api_key
MTN_API_SECRET=your_mtn_api_secret

# Twilio (Fallback)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Provider Priority

Providers are tried in order of priority (1 = highest):

1. **Priority 1**: Kairos (Ghana-specific)
2. **Priority 2**: Africa's Talking (Pan-African)
3. **Priority 3**: MTN (Network-specific)
4. **Priority 10**: Twilio (Global fallback)

## 🚀 Usage

### Send SMS (Automatic Routing)

```typescript
import { SMSProviderRouter } from '@core/providers/sms';

// Router automatically selects best provider
const response = await SMSProviderRouter.sendSMS(
  {
    recipient: '+233244123456',
    message: 'Hello from Ghana!',
    senderId: 'MyApp',
    messageId: 'msg_123',
  },
  'GH', // Country code
  'mtn' // Network (optional)
);

if (response.success) {
  console.log('SMS sent:', response.externalId);
} else {
  console.error('Failed:', response.message);
}
```

### Use Specific Provider

```typescript
import { SMSProviderFactory } from '@core/providers/sms';

// Get Kairos provider
const kairos = SMSProviderFactory.getProvider('kairos');

if (kairos) {
  const response = await kairos.sendSMS({
    recipient: '233244123456',
    message: 'Direct via Kairos',
    senderId: 'MyApp',
  });
}
```

### Check Provider Health

```typescript
import { SMSProviderFactory } from '@core/providers/sms';

// Health check all providers
const health = await SMSProviderFactory.healthCheckAll();

console.log(health);
// {
//   kairos: { healthy: true, message: 'Provider is healthy', balance: 100.50 },
//   africastalking: { healthy: true, balance: 250.00 },
//   ...
// }
```

### Get Provider Statistics

```typescript
import { SMSProviderFactory } from '@core/providers/sms';

const stats = SMSProviderFactory.getProviderStats();

console.log(stats);
// {
//   kairos: {
//     totalSent: 1000,
//     totalDelivered: 950,
//     totalFailed: 50,
//     successRate: 95.0,
//     avgLatency: 250,
//     config: { countries: ['GH'], priority: 1 }
//   },
//   ...
// }
```

## 🎯 Routing Logic

### 1. **Country-Based Routing**
```typescript
// Ghana → Tries: Kairos → Africa's Talking → Twilio
// Nigeria → Tries: Africa's Talking → MTN → Twilio
// Kenya → Tries: Africa's Talking → Twilio
```

### 2. **Network-Based Routing**
```typescript
// Ghana MTN → Tries: Kairos → MTN Direct → Africa's Talking
// Nigeria MTN → Tries: MTN Direct → Africa's Talking
```

### 3. **Fallback Mechanism**
If primary provider fails, automatically tries next provider:

```typescript
Kairos (failed) → Africa's Talking (failed) → Twilio (success)
```

### 4. **Selection Criteria**
```typescript
// By cost (priority-based)
const provider = SMSProviderRouter.getBestProvider('GH', 'mtn', 'cost');

// By speed (lowest latency)
const provider = SMSProviderRouter.getBestProvider('GH', 'mtn', 'speed');

// By reliability (highest success rate)
const provider = SMSProviderRouter.getBestProvider('GH', 'mtn', 'reliability');
```

## 🔌 Adding New Providers

### Step 1: Create Provider Class

```typescript
// src/core/providers/sms/myprovider.provider.ts
import { BaseSMSProvider } from './base-sms.provider';

export class MyProvider extends BaseSMSProvider {
  async sendSMS(options: SendSMSOptions): Promise<ProviderResponse> {
    // Implementation
  }

  async getDeliveryStatus(externalId: string): Promise<DeliveryStatus> {
    // Implementation
  }

  async checkBalance(): Promise<ProviderBalance> {
    // Implementation
  }
}
```

### Step 2: Add to Factory

```typescript
// src/core/providers/sms/provider.factory.ts
import { MyProvider } from './myprovider.provider';

// In initializeProviders()
if (env.MYPROVIDER_API_KEY) {
  const provider = new MyProvider({
    name: 'MyProvider',
    type: 'SMS',
    credentials: {
      apiKey: env.MYPROVIDER_API_KEY,
    },
    supportedCountries: ['GH', 'NG'],
    priority: 2,
  });

  this.providers.set('myprovider', provider);
}
```

### Step 3: Add Environment Variables

```env
MYPROVIDER_API_KEY=your_api_key
```

## 📊 Provider Statistics

Each provider tracks:
- **totalSent**: Total messages sent
- **totalDelivered**: Successfully delivered
- **totalFailed**: Failed deliveries
- **successRate**: Delivery success percentage
- **avgLatency**: Average response time (ms)
- **lastUsed**: Last usage timestamp

## 🧪 Testing

### Test Provider Connection

```typescript
const kairos = SMSProviderFactory.getProvider('kairos');
const isHealthy = await kairos.testConnection();

console.log('Kairos healthy:', isHealthy);
```

### Test SMS Sending

```typescript
// Test with placeholder providers (won't actually send)
const response = await SMSProviderRouter.sendSMS(
  {
    recipient: '+233244123456',
    message: 'Test message',
    senderId: 'Test',
  },
  'KE' // Kenya (uses Africa's Talking placeholder)
);
```

## 🚧 Implementation Status

### ✅ **Complete**
- ✅ Base provider architecture
- ✅ Provider factory
- ✅ Provider router
- ✅ Kairos provider (Ghana)
- ✅ Auto-initialization
- ✅ Health checks
- ✅ Statistics tracking

### 🚧 **Pending Implementation**
- 🚧 Africa's Talking API integration
- 🚧 MTN Direct API integration
- 🚧 Twilio API integration
- 🚧 Delivery receipt webhooks
- 🚧 Provider failover alerts
- 🚧 Cost optimization algorithms

## 📝 Notes

1. **Kairos** is the only fully implemented provider
2. Other providers are **placeholders** with the structure ready
3. To implement a provider, install its package and add the API calls
4. Router automatically handles failover between providers
5. All providers log their activities for monitoring

## 🔗 Provider Documentation

- **Kairos**: https://kairos.com/docs
- **Africa's Talking**: https://developers.africastalking.com
- **MTN**: https://developer.mtn.com
- **Twilio**: https://www.twilio.com/docs/sms

---

**🌍 Built for Africa | Supporting 54 Countries**