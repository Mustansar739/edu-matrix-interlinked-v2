## Social Activity Notifications

### 1. Job & Freelancing Notifications
```typescript
interface JobActivityNotifications {
  newJobs: {
    jobPost: {
      icon: "💼";
      template: "{company} posted a new job: {position}";
      action: "View Job";
      relevance: "Based on your skills";
    };

    jobMatch: {
      icon: "🎯";
      template: "New job match: {position} at {company}";
      action: "Quick Apply";
      priority: "high";
    };
  };

  freelanceWork: {
    newProject: {
      icon: "🚀";
      template: "New {category} project: {title}";
      action: "View Details";
      matchScore: "Skills match %";
    };

    projectRecommendation: {
      icon: "⭐";
      template: "Recommended project: {title}";
      action: "Check it out";
      reason: "Based on your profile";
    };
  };

  opportunities: {
    skillMatch: {
      icon: "✨";
      template: "New opportunity matching {skill}";
      relevanceScore: "Match percentage";
    };

    trendingSkills: {
      icon: "📈";
      template: "{skill} is trending in your area";
      action: "Explore projects";
    };
  };
}
```

### 2. Social Activity Notifications
```typescript
interface SocialNotifications {
  interactions: {
    postMention: {
      icon: "📣";
      template: "{user} mentioned you in a post";
      preview: "Post preview text...";
    };

    postReaction: {
      icon: "👍";
      template: "{user} and {count} others liked your post";
      grouping: "Group similar reactions";
    };

    comments: {
      icon: "💬";
      template: "{user} commented on your post";
      preview: "Comment preview...";
    };

    shares: {
      icon: "🔄";
      template: "{user} shared your post";
      reach: "View impact";
    };
  };

  connections: {
    newFollower: {
      icon: "👋";
      template: "{user} started following you";
      action: "View profile";
    };

    profileViews: {
      icon: "👀";
      template: "{count} people viewed your profile";
      timing: "This week";
    };
  };
}
```

### 3. Real-Time Event Groups
```typescript
interface NotificationGroups {
  jobAlerts: {
    type: "job";
    groupKey: "jobId";
    stackBehavior: "stack_similar";
    maxStack: 3;
    summary: "{count} new jobs match your profile";
  };

  projectAlerts: {
    type: "project";
    groupKey: "categoryId";
    stackBehavior: "show_latest";
    maxStack: 5;
    summary: "New projects in {category}";
  };

  socialUpdates: {
    type: "social";
    groupKey: "postId";
    stackBehavior: "combine_actors";
    maxStack: 3;
    summary: "{count} new interactions on your post";
  };
}
```

### 4. Notification Actions
```typescript
interface QuickActions {
  jobs: {
    apply: "One-click apply";
    save: "Save for later";
    hide: "Not interested";
    share: "Share job";
  };

  projects: {
    contact: "Message client";
    propose: "Submit proposal";
    bookmark: "Save project";
    share: "Share project";
  };

  social: {
    reply: "Quick reply";
    react: "Add reaction";
    share: "Share post";
    mute: "Mute thread";
  };
}
```

### 5. Notification Preferences
```typescript
interface NotificationSettings {
  jobPreferences: {
    matching: boolean;     // Jobs matching your skills
    recommended: boolean;  // Recommended positions
    saved: boolean;       // Updates to saved jobs
    company: boolean;     // New jobs from followed companies
  };

  projectPreferences: {
    matching: boolean;     // Projects matching skills
    budget: boolean;      // Projects in your budget range
    category: boolean;    // Specific project categories
    trending: boolean;    // Trending project types
  };

  socialPreferences: {
    mentions: boolean;     // When mentioned
    reactions: boolean;    // Likes and reactions
    comments: boolean;     // Comment notifications
    shares: boolean;      // Share notifications
  };

  deliveryPreferences: {
    realTime: boolean;    // Instant notifications
    digest: "none" | "daily" | "weekly";  // Summary format
    quietHours: {
      enabled: boolean;
      start: string;      // "22:00"
      end: string;        // "08:00"
    };
  };
}
```

### 6. Implementation Guidelines

#### Notification Behavior
- Instant delivery for high-priority notifications
- Batch similar notifications to prevent spam
- Smart grouping of related activities
- Context-aware notification timing

#### User Experience
- One-click actions from notification
- Rich preview content
- Contextual relevance indicators
- Smart notification cleanup

#### Mobile Experience
- Push notification support
- Quick action gestures
- Priority-based delivery
- Battery-efficient updates

## Social Notifications Updates
- Documented notification triggers and delivery methods.
- Added sample templates and user customization options.

Generated by Copilot