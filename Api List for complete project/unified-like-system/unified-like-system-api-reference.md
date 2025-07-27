# Edu Matrix Interlinked 


# Unified Like System API Reference

## 📋 **QUICK REFERENCE**

**Module:** Unified Like System (`/api/unified-likes`)  
**Tech Stack:** Next.js 15 + TypeScript 5.8.2 + PostgreSQL 17 + Prisma ORM  
**Authentication:** NextAuth.js 5.0 (Required on all endpoints)  
**Real-time:** Socket.IO + Kafka + Redis  

---

## 🚀 **API ENDPOINTS**

### **Core Like Management**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/unified-likes/[contentType]/[contentId]` | GET, POST, DELETE | Universal like operations across all content |

---

##  **REACT HOOKS USED**

### **Core Hooks**
- `useUnifiedLikes` - Universal like system across all content types
- `useSocket` - Real-time updates via Socket.IO
- `useToast` (shadcn/ui) - User feedback notifications
- `useQueryClient` (TanStack Query) - Cache management

### **Content Types Supported**
- `post` - Social media posts
- `comment` - Comment reactions  
- `profile` - Profile appreciation
- `story` - Story reactions
- `project` - Project likes

### **Reaction Types**
- `like` 👍 - General appreciation
- `love` ❤️ - Strong positive reaction
- `laugh` 😂 - Humorous content
- `wow` � - Surprising content
- `sad` 😢 - Sympathetic reaction
- `angry` 😡 - Disagreement
- `helpful` 💡 - Educational content

---

## � **SUMMARY**

**Total Endpoints:** 1 (Universal endpoint)  
**Authentication:** Required on all endpoints via NextAuth.js  
**Real-time Features:** Socket.IO + Kafka integration  
**Content Types:** 5 supported types  
**Reaction Types:** 7 Facebook-style emotions  

**Key Features:**
- ✅ Universal like system across all platform modules
- ✅ Facebook-style reactions with emoji support
- ✅ Real-time updates with optimistic UI
- ✅ Cross-platform aggregation to profile
- ✅ TypeScript safety throughout

---

*Last Updated: 2025-01-09 | Production Ready | Next.js 15 Official Patterns*
