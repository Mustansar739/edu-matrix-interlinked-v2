# Edu Matrix Interlinked 
# Students Interlinked API Reference

## 📋 **QUICK REFERENCE**

**Module:** Students Interlinked (`/students-interlinked`)  
**Tech Stack:** Next.js 15 + TypeScript 5.8.2 + PostgreSQL 17 + Prisma ORM  
**Authentication:** NextAuth.js 5.0 (Required on all endpoints)  
**Real-time:** Socket.IO + Kafka + Redis  

---

## 🚀 **API ENDPOINTS**

### **Posts Management**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/students-interlinked/posts` | GET, POST | List/Create posts with media & polls |
| `/api/students-interlinked/posts/[postId]` | GET, PUT, DELETE | Single post operations |
| `/api/students-interlinked/posts/[postId]/comments` | GET, POST | Comments with nested replies |
| `/api/students-interlinked/posts/[postId]/reactions` | GET, POST, DELETE | Facebook-style reactions |
| `/api/students-interlinked/posts/[postId]/share` | GET, POST | Share posts with custom message |
| `/api/students-interlinked/posts/[postId]/shares` | GET | List users who shared post |
| `/api/students-interlinked/posts/[postId]/share/status` | GET | Check user's share status |

### **Stories System**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/students-interlinked/stories` | GET, POST | 24-hour stories with auto-expiration |
| `/api/students-interlinked/stories/[storyId]/view` | POST | Record story views & analytics |

### **Groups & Communities**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/students-interlinked/groups` | GET, POST | Browse/Create study groups |
| `/api/students-interlinked/groups/[groupId]` | GET, PUT, DELETE | Group management |
| `/api/students-interlinked/groups/[groupId]/join` | POST, DELETE | Join/leave groups |
| `/api/students-interlinked/groups/[groupId]/members` | GET, POST | Member management |
| `/api/students-interlinked/groups/[groupId]/posts` | GET, POST | Group-specific posts |

### **Notifications**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/students-interlinked/notifications` | GET, POST | Real-time notifications |
| `/api/students-interlinked/notifications/mark-all-read` | POST | Bulk mark as read |

### **Social Features (External)**
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/unified-likes/[contentType]/[contentId]` | GET, POST, DELETE | Universal like system |
| `/api/follow/[userId]` | POST, DELETE | Follow/unfollow users |
| `/api/follow/[userId]/status` | GET | Check follow relationship |

---

## 🎣 **REACT HOOKS USED**

### **Core Hooks**
- `useSession` (NextAuth.js) - Authentication state
- `useRouter` (Next.js) - Navigation
- `useState`, `useEffect`, `useCallback`, `useMemo` (React)

### **Custom Hooks**
- `useUnifiedLikes` - Like/unlike functionality across all content
- `useToast` (shadcn/ui) - User feedback notifications
- `usePollVote` - Poll voting system
- `useNotifications` - Real-time notification management
- `useStudentsInterlinkedStories` - Stories data fetching
- `useStudentsInterlinkedPosts` - Posts data management
- `useGroups` - Groups data & operations
- `useJoinLeaveGroup` - Group membership management

### **Query Hooks (TanStack Query)**
- `useQuery` - Data fetching with caching
- `useMutation` - Data mutations with optimistic updates
- `useQueryClient` - Query cache management

---

## 📊 **SUMMARY**

**Total Endpoints:** 19 (16 Students Interlinked + 3 External)  
**Authentication:** Required on all endpoints via NextAuth.js  
**Real-time Features:** Socket.IO + Kafka integration  
**File Structure:** Next.js 15 App Router with TypeScript  

**Key Features:**
- ✅ Facebook-style social posts with media
- ✅ Instagram-style 24-hour stories  
- ✅ Nested comment system
- ✅ Study groups & communities
- ✅ Real-time notifications
- ✅ Universal like/reaction system
- ✅ Follow/unfollow networking
- ✅ Educational polls & interactions

---

*Last Updated: 2025-01-09 | Production Ready | Next.js 15 Official Patterns*
