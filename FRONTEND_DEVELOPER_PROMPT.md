# Frontend Developer Prompt: Blog Management & Cross-Platform Publishing

## 🎯 **Project Overview**

You need to create a comprehensive blog management interface that allows users to create, edit, publish, and cross-post blog content to LinkedIn and Medium from a single unified page. The interface should be modern, intuitive, and provide real-time feedback on publishing status.

## 🏗️ **Technical Requirements**

### **Tech Stack**

- **Framework**: React/Next.js (or your preferred modern framework)
- **Styling**: Tailwind CSS or styled-components
- **State Management**: React Context, Redux, or Zustand
- **HTTP Client**: Axios or fetch API
- **Rich Text Editor**: TipTap, Quill, or Draft.js
- **Icons**: Lucide React, Heroicons, or similar
- **Date Handling**: date-fns or dayjs
- **Form Validation**: React Hook Form + Zod

### **Design System**

- **Color Palette**: Modern, professional colors
- **Typography**: Clean, readable fonts
- **Spacing**: Consistent 8px grid system
- **Components**: Reusable, accessible components
- **Responsive**: Mobile-first design approach

## 📱 **Page Structure & Layout**

### **Main Blog Dashboard Page** (`/dashboard/blogs`)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Blog Management + Platform Connections              │
├─────────────────────────────────────────────────────────────┤
│ Sidebar: Quick Stats + Navigation                          │
├─────────────────────────────────────────────────────────────┤
│ Main Content Area:                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tab Navigation: Drafts | Published | All Posts          │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Blog List (Table/Grid View)                             │ │
│ │ - Title, Status, Views, Published Date, Actions        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Blog Editor Page** (`/dashboard/blogs/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Save Draft | Publish | Platform Connections        │
├─────────────────────────────────────────────────────────────┤
│ Main Editor Area:                                           │
│ ┌─────────────────┬───────────────────────────────────────┐ │
│ │                 │                                      │ │
│ │ Form Sidebar    │ Rich Text Editor                     │ │
│ │ - Title         │ - Full-screen editing                │ │
│ │ - Excerpt       │ - Toolbar with formatting            │ │
│ │ - Tags          │ - Auto-save functionality            │ │
│ │ - SEO Settings  │                                      │ │
│ │ - Featured Img  │                                      │ │
│ │                 │                                      │ │
│ └─────────────────┴───────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Publishing Section:                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Platform Integration Panel                              │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│ │ │ LinkedIn    │ │ Medium      │ │ Publish Settings    │ │
│ │ │ [Connect]   │ │ [Connect]   │ │ - Schedule          │ │
│ │ │ Status: ✅  │ │ Status: ❌  │ │ - Visibility        │ │
│ │ └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 **Key Components to Build**

### **1. Blog List Component**

```typescript
interface BlogListProps {
  blogs: Blog[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onView: (id: string) => void;
}
```

**Features:**

- Table/Grid view toggle
- Search and filter functionality
- Bulk actions (delete, publish)
- Status badges (Draft, Published, Archived)
- View count display
- Last modified date
- Quick action buttons

### **2. Blog Editor Component**

```typescript
interface BlogEditorProps {
  blog?: Blog;
  onSave: (data: BlogFormData) => void;
  onPublish: (data: BlogFormData, platforms: string[]) => void;
}
```

**Features:**

- Rich text editor with toolbar
- Auto-save functionality
- Form validation
- SEO preview
- Tag management with autocomplete
- Featured image upload
- Read time estimation

### **3. Platform Integration Panel**

```typescript
interface PlatformPanelProps {
  platforms: PlatformStatus[];
  onConnect: (platform: string) => void;
  onDisconnect: (platform: string) => void;
  onPublish: (platforms: string[]) => void;
}
```

**Features:**

- LinkedIn connection status
- Medium connection status
- OAuth flow handling
- Publish status indicators
- Error message display
- Retry functionality

### **4. Publishing Modal**

```typescript
interface PublishingModalProps {
  isOpen: boolean;
  blog: Blog;
  platforms: PlatformStatus[];
  onPublish: (platforms: string[]) => void;
  onClose: () => void;
}
```

**Features:**

- Platform selection checkboxes
- Preview of what will be published
- Publishing progress indicators
- Success/error feedback
- External link generation

## 🔌 **API Integration**

### **Blog Management Endpoints**

```typescript
// API service functions
const blogAPI = {
  // Get blogs with filters
  getBlogs: (params: BlogFilters) => Promise<BlogListResponse>,

  // Create new blog
  createBlog: (data: BlogFormData) => Promise<Blog>,

  // Update blog
  updateBlog: (id: string, data: Partial<BlogFormData>) => Promise<Blog>,

  // Delete blog
  deleteBlog: (id: string) => Promise<void>,

  // Publish blog
  publishBlog: (id: string, platforms: string[]) => Promise<Blog>,

  // Get publish status
  getPublishStatus: (id: string) => Promise<PublishStatus>,

  // Get blog statistics
  getBlogStats: () => Promise<BlogStats>,
};
```

### **OAuth Integration**

```typescript
const oauthAPI = {
  // Get LinkedIn auth URL
  getLinkedInAuthUrl: () => Promise<{ authUrl: string }>,

  // Get Medium auth URL
  getMediumAuthUrl: () => Promise<{ authUrl: string }>,

  // Get connected platforms
  getConnectedPlatforms: () => Promise<PlatformToken[]>,

  // Disconnect platform
  disconnectPlatform: (platform: string) => Promise<void>,
};
```

## 🎯 **User Experience Requirements**

### **1. Blog Creation Flow**

1. **Quick Start**: "New Blog Post" button → Opens editor
2. **Auto-save**: Save draft every 30 seconds
3. **Validation**: Real-time form validation
4. **Preview**: Live preview of how content will look
5. **SEO Helper**: Suggestions for meta titles/descriptions

### **2. Publishing Flow**

1. **Platform Connection**: One-click OAuth for LinkedIn/Medium
2. **Publish Options**: Choose platforms to publish to
3. **Progress Tracking**: Real-time status updates
4. **Success Feedback**: Links to published posts
5. **Error Handling**: Clear error messages with retry options

### **3. Platform Integration UX**

```
┌─────────────────────────────────────────────────────────┐
│ Platform Connections                                    │
├─────────────────────────────────────────────────────────┤
│ LinkedIn                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✅ Connected as John Doe                            │ │
│ │ Last used: 2 hours ago                              │ │
│ │ [Disconnect] [Test Connection]                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Medium                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ❌ Not connected                                     │ │
│ │ [Connect Account]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🎨 **Design Specifications**

### **Color Palette**

```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Status Colors */
--success-500: #10b981;
--warning-500: #f59e0b;
--error-500: #ef4444;
--info-500: #06b6d4;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-800: #1f2937;
--gray-900: #111827;
```

### **Component Styling**

- **Cards**: Subtle shadows, rounded corners (8px)
- **Buttons**: Consistent padding, hover states
- **Forms**: Clean inputs with focus states
- **Status Badges**: Color-coded with icons
- **Loading States**: Skeleton loaders, spinners

### **Responsive Breakpoints**

```css
/* Mobile First */
@media (min-width: 640px) {
  /* sm */
}
@media (min-width: 768px) {
  /* md */
}
@media (min-width: 1024px) {
  /* lg */
}
@media (min-width: 1280px) {
  /* xl */
}
```

## 🔄 **State Management**

### **Blog State**

```typescript
interface BlogState {
  blogs: Blog[];
  currentBlog: Blog | null;
  loading: boolean;
  error: string | null;
  filters: BlogFilters;
  pagination: PaginationInfo;
}

interface BlogActions {
  fetchBlogs: (filters?: BlogFilters) => Promise<void>;
  createBlog: (data: BlogFormData) => Promise<void>;
  updateBlog: (id: string, data: Partial<BlogFormData>) => Promise<void>;
  deleteBlog: (id: string) => Promise<void>;
  publishBlog: (id: string, platforms: string[]) => Promise<void>;
}
```

### **Platform State**

```typescript
interface PlatformState {
  connectedPlatforms: PlatformToken[];
  publishingStatus: Record<string, PublishStatus>;
  loading: boolean;
  error: string | null;
}

interface PlatformActions {
  connectPlatform: (platform: string) => Promise<void>;
  disconnectPlatform: (platform: string) => Promise<void>;
  publishToPlatforms: (blogId: string, platforms: string[]) => Promise<void>;
  checkPublishStatus: (blogId: string) => Promise<void>;
}
```

## 🚀 **Implementation Priority**

### **Phase 1: Core Blog Management**

1. Blog list with basic CRUD operations
2. Simple blog editor (title, content, tags)
3. Basic publishing (no cross-platform)

### **Phase 2: Enhanced Editor**

1. Rich text editor integration
2. SEO settings panel
3. Auto-save functionality
4. Preview mode

### **Phase 3: Platform Integration**

1. OAuth connection flows
2. Platform status indicators
3. Cross-platform publishing
4. Publish status tracking

### **Phase 4: Polish & Optimization**

1. Advanced filtering and search
2. Bulk operations
3. Analytics dashboard
4. Performance optimization

## 📋 **Testing Requirements**

### **Unit Tests**

- Component rendering
- Form validation
- API integration
- State management

### **Integration Tests**

- OAuth flow completion
- Publishing workflow
- Error handling scenarios

### **E2E Tests**

- Complete blog creation flow
- Cross-platform publishing
- User authentication

## 🎯 **Success Criteria**

1. **User can create and edit blog posts** with rich text editor
2. **Auto-save works reliably** without data loss
3. **OAuth connections are seamless** for LinkedIn and Medium
4. **Publishing provides clear feedback** on success/failure
5. **Interface is responsive** across all device sizes
6. **Performance is optimized** for large blog lists
7. **Error handling is user-friendly** with clear messages

## 📚 **Additional Resources**

- **API Documentation**: See `BLOG_FEATURE.md`
- **Design System**: Use consistent component library
- **Accessibility**: Follow WCAG 2.1 guidelines
- **Performance**: Aim for <3s load times
- **SEO**: Implement proper meta tags and structured data

---

**Remember**: The goal is to create a seamless experience where users can focus on content creation while the platform handles all the complexity of cross-platform publishing behind the scenes. The interface should feel intuitive and provide clear feedback at every step.
