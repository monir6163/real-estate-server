# 🤖 AI Chatbot - Data-Aware Features

## আপনার প্রজেক্টের ডেটা দিয়ে শক্তিশালী চ্যাটবট

এই আপডেটে, চ্যাটবটকে আপনার প্রজেক্টের প্রকৃত ডেটা (Properties, Bookings, Reviews) ব্যবহার করার ক্ষমতা দেওয়া হয়েছে।

---

## ✨ নতুন বৈশিষ্ট্য

### 1. **User-Specific Context** - ব্যবহারকারীর নিজের ডেটা দেখায়

- 👤 ব্যবহারকারীর Role (CUSTOMER, AGENT, ADMIN)
- 🏠 Agent-দের জন্য: কতটা প্রপার্টি লিস্ট করেছেন
- 📅 Customer-দের জন্য: কতটা বুকিং আছে
- ⭐ কতটা রিভিউ দিয়েছেন

### 2. **Property Information** - এজেন্টদের প্রপার্টিজ সম্পর্কে জানায়

চ্যাটবট এজেন্টদের সাম্প্রতিক 5টি প্রপার্টির তথ্য জানে:

```
নাম: "Modern 3BHK Apartment"
অবস্থান: "Bangalore, Indiranagar"
মূল্য: ₹50,00,000
```

### 3. **Booking History** - বুকিংয়ের তথ্য দেখায়

- সর্বশেষ 3টি বুকিং এর স্ট্যাটাস
- বুকিং আইডি এবং প্রপার্টি রেফারেন্স

### 4. **Smart System Prompt** - উন্নত নির্দেশনা

চ্যাটবটের নতুন সিস্টেম প্রম্পট:

- বিস্তারিত বৈশিষ্ট্য বর্ণনা
- ব্যবহারকারীর ব্যক্তিগত প্রসঙ্গ (context)
- পেশাদার এবং সহায়ক টোন
- সঠিক ফরম্যাটিং গাইডলাইন

---

## 🔄 কীভাবে কাজ করে

### ক্লায়েন্টের দৃষ্টিভঙ্গি

```
ব্যবহারকারী: "আমার প্রপার্টিজ কেমন?"
          ↓
     চ্যাট সার্ভিস
          ↓
চ্যাটবট: "আপনার কাছে 3টি প্রপার্টি আছে:
   1. Luxury Villa, Mumbai - ₹1.5 Cr
   2. Modern Flat, Bangalore - ₹50 Lakh
   3. Ready Home, Hyderabad - ₹45 Lakh

আপনার সমস্ত প্রপার্টি সক্রিয় এবং বুকিংয়ের জন্য উপলব্ধ।"
```

### সার্ভারের দৃষ্টিভঙ্গি

```
streamChatHandler (chat.controller.ts)
   ↓
fetchUserContextData() - ডাটাবেস থেকে ডেটা ফেচ করে
   ↓
formatContextForPrompt() - ডেটা ফরম্যাট করে মানুষের জন্য পড়ার মতো
   ↓
generateSystemPrompt() - ব্যক্তিগতকৃত প্রম্পট তৈরি করে
   ↓
OpenAI/Gemini API - চূড়ান্ত উত্তর তৈরি করে
```

---

## 📝 বাস্তবায়নের বিবরণ

### নতুন ফাইল: `src/app/modules/chat/chat.context.ts`

```typescript
// ডেটাবেস থেকে ইউজার-স্পেসিফিক ডেটা ফেচ করে
export async function fetchUserContextData(userId, role) {
  // ৫টি সর্বশেষ প্রপার্টি ফেচ করে (যদি এজেন্ট হয়)
  // ৩টি সর্বশেষ বুকিং ফেচ করে
  // রিভিউ কাউন্ট পায়
  return enrichedContext;
}

// কনটেক্সটকে পড়ার মতো টেক্সটে রূপান্তরিত করে
export function formatContextForPrompt(context) {
  // "📍 User is a property agent with 5 properties listed."
  // "👤 They are a customer/buyer."
  return formattedText;
}
```

### আপডেট: `src/app/lib/openai.ts`

```typescript
// ChatContext extends করা হয়েছে নতুন ফিল্ডস দিয়ে
export interface ChatContext {
  propertyCount?: number;
  userRole?: string;
  bookingCount?: number;
  userProperties?: Array<{...}>;  // নতুন
  userBookings?: Array<{...}>;    // নতুন
  totalReviews?: number;          // নতুন
  contextFormatted?: string;      // নতুন
}

// System prompt এখন ব্যক্তিগত ডেটা অন্তর্ভুক্ত করে
export function generateSystemPrompt(context) {
  // বেস প্রম্পট + ব্যক্তির তথ্য
  return enhancedPrompt;
}
```

### আপডেট: `src/app/modules/chat/chat.controller.ts`

```typescript
const streamChatHandler = async (req, res) => {
  // নতুন স্টেপ: ডেটা ফেচ করা
  const enrichedContext = await fetchUserContextData(userId, userRole);
  const contextFormatted = formatContextForPrompt(enrichedContext);

  // সব ডেটা streamChat এ পাঠানো
  const stream = await streamChat(messages, {
    ...enrichedContext,
    contextFormatted,
  });
};
```

---

## 🧪 পরীক্ষা করুন

### চ্যাটবটকে টেস্ট করার জন্য এই প্রশ্নগুলি করুন:

#### এজেন্টদের জন্য (আপনি যদি লিস্টার হন):

```
1. "আমার কাছে কতটা প্রপার্টি আছে?"
2. "আমার প্রপার্টিজ এর বিবরণ দাও"
3. "কীভাবে নতুন প্রপার্টি লিস্ট করব?"
4. "আমার সর্বশেষ বুকিংস কী?"
```

#### কাস্টমারদের জন্য:

```
1. "আমার বুকিংস কী?"
2. "বুকিং ক্যান্সেল করব কীভাবে?"
3. "আমি কী রিভিউ দিয়েছি?"
4. "নতুন প্রপার্টি খুঁজব কীভাবে?"
```

---

## 🔒 নিরাপত্তা

✅ **সকল নিরাপত্তা বৈশিষ্ট্য বজায় রাখা হয়েছে:**

- শুধুমাত্র লগইন করা ব্যবহারকারী ডেটা দেখতে পারে
- প্রতিটি ব্যবহারকারী শুধুমাত্র নিজেদের ডেটা দেখে
- সার্ভার-সাইডে সব প্রসেসিং হয় (API key সুরক্ষিত)
- Input validation Zod দিয়ে করা হয়

---

## 📊 ডাটাবেস কোয়েরি

চ্যাটবট এই ডেটা অ্যাক্সেস করে:

```prisma
// User এর প্রপার্টিজ (এজেন্টদের জন্য)
Property.findMany({
  where: { agentId: userId }
  select: { id, title, location, price }
  take: 5
  orderBy: { createdAt: 'desc' }
})

// User এর বুকিংস
Booking.findMany({
  where: { customerId: userId }
  select: { id, propertyId, status }
  take: 3
  orderBy: { createdAt: 'desc' }
})

// User এর রিভিউ কাউন্ট
Review.count({
  where: { customerId: userId }
})

// প্রপার্টি কাউন্ট (এজেন্টদের জন্য)
Property.count({
  where: { agentId: userId }
})
```

---

## 🚀 ব্যাকএন্ড সেটআপ

### পূর্বশর্ত

```bash
# নিশ্চিত করুন OPENAI_API_KEY আছে
OPENAI_API_KEY=sk_test_...

# অথবা GEMINI_API_KEY
GEMINI_API_KEY=AIzaSyD...
```

### ইনস্টল এবং রান করুন

```bash
cd f:\level-2-assignment\real-state-server

# ডিপেন্ডেন্সি ইনস্টল করুন
pnpm install

# ডেভেলপমেন্ট সার্ভার চালু করুন
pnpm run dev
```

---

## 🎯 পরবর্তী উন্নয়ন (ভবিষ্যতের জন্য)

- [ ] চ্যাট হিস্টরি ডাটাবেসে সেভ করা (বর্তমানে Zustand ইন-মেমরি স্টোরে)
- [ ] প্রপার্টি ইমেজ দেখানো
- [ ] বুকিং স্ট্যাটাস আপডেট স্বয়ংক্রিয় ট্র্যাকিং
- [ ] এআই দিয়ে স্বয়ংক্রিয় রিপ্লাই সাজেশন
- [ ] মাল্টি-ল্যাঙ্গুয়েজ সাপোর্ট
- [ ] চ্যাটবট এ প্রপার্টি ফিল্টার এবং সার্চ ক্ষমতা

---

## 📞 সাপোর্ট

যদি চ্যাটবট সঠিকভাবে কাজ না করে:

1. **ব্যাকএন্ড লগ চেক করুন:**

   ```bash
   logs/all.log
   logs/error.log
   ```

2. **ফ্রন্টএন্ড কনসোল এ এরর দেখুন:**

   ```javascript
   // Browser DevTools > Console Tab
   ```

3. **API এন্ডপয়েন্ট টেস্ট করুন:**
   ```bash
   curl -X POST http://localhost:5000/api/v1/chat/stream \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hi"}]}'
   ```

---

## 📖 মূল কনসেপ্ট

| কনসেপ্ট           | ব্যাখ্যা                                               |
| ----------------- | ------------------------------------------------------ |
| **System Prompt** | চ্যাটবটকে বলে কে, কী পারে এবং কীভাবে কথা বলবে          |
| **Context**       | চ্যাটবটকে ব্যবহারকারীর ব্যক্তিগত ডেটা সম্পর্কে জানায়  |
| **Streaming**     | উত্তর শব্দে শব্দে পাঠানো হয় (দ্রুত এবং মসৃণ অভিজ্ঞতা) |
| **SSE**           | Server-Sent Events - স্ট্রিমিং এর জন্য প্রযুক্তি       |
| **Fallback**      | যদি OpenAI ব্যর্থ হয়, Gemini ব্যবহার করে              |
