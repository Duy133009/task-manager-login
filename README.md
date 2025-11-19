# 🚀 Modern Task Manager

A powerful, beautiful, and intuitive task management application built with vanilla JavaScript and Supabase. Designed to help you organize your life with style and efficiency.

![Task Manager Dashboard](https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=2072&ixlib=rb-4.0.3)

## ✨ Key Features

### 🎨 Stunning UI/UX
- **Glassmorphism Design**: A modern, translucent interface that looks great on any device.
- **Dark Mode Support**: Easy on the eyes, perfect for late-night productivity.
- **Smooth Animations**: Fluid transitions, hover effects, and micro-interactions powered by CSS Keyframes.
- **Confetti Celebrations**: Get rewarded with a burst of confetti whenever you complete a task! 🎉

### 📊 Powerful Task Management
- **Kanban Board**: Visualize your workflow with a drag-and-drop Kanban board (Pending, In Progress, Completed).
- **Smart Lists**: Filter tasks by "Owned", "Assigned", "Subscribed", or "All".
- **Advanced Filtering**: Sort by priority, due date, or status.
- **Real-time Updates**: Changes are reflected instantly across the application.

### 🔔 Interactive Notifications
- **Toast System**: Beautiful, non-intrusive notifications for success, error, and info messages.
- **Skeleton Loading**: Polished loading states for a seamless user experience.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Variables, Flexbox, Grid), Vanilla JavaScript (ES6+).
- **Backend**: Supabase (PostgreSQL, Auth, Realtime).
- **Architecture**: Modular MVC-inspired structure with dedicated Services and Controllers.

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/task-manager-login.git
    ```

2.  **Open `index.html`**
    Simply open the `index.html` file in your browser. No build step required!

3.  **Configure Supabase**
    Update `config.js` with your Supabase project URL and Anon Key.

## 📂 Project Structure

```
task-manager-login/
├── assets/
│   ├── css/
│   │   ├── dashboard.css    # Main dashboard styles
│   │   └── styles.css       # Global styles
│   └── js/
│       ├── controllers/     # UI Controllers (Kanban, etc.)
│       ├── services/        # Business Logic (Auth, Toast, Confetti)
│       └── dashboard.js     # Main application logic
├── dashboard.html           # Main application view
└── index.html               # Login/Landing page
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
