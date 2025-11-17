# Task Manager - Login System

A modern task management system with authentication powered by Supabase.

## 📁 Project Structure

```
task-manager-login/
├── index.html              # Login/Registration page
├── dashboard.html          # Task management dashboard
│
├── assets/                 # Static resources
│   ├── css/
│   │   ├── styles.css      # Styles for login page
│   │   └── dashboard.css   # Styles for dashboard page
│   └── js/
│       ├── app.js          # Login/Registration logic
│       ├── config.js       # Supabase configuration
│       └── dashboard.js    # Dashboard logic
│
├── config/                 # Configuration files
│   ├── firebase-config.js  # Firebase configuration (if needed)
│   └── firebase-init.js    # Firebase initialization (if needed)
│
├── docs/                   # Documentation
│   ├── README.md           # Main documentation
│   ├── DEPLOY.md           # Deployment guide
│   └── ...                 # Other documentation files
│
├── scripts/                # Utility scripts
│   └── push-to-github.ps1  # Script to push code to GitHub
│
├── templates/              # Reference templates
│   └── SignUp-LogIn-Form V2.0/
│
├── .gitignore              # Git ignore rules
├── netlify.toml            # Netlify configuration
└── vercel.json             # Vercel configuration
```

## 🚀 Features

- ✅ User authentication (Login/Registration) with Supabase
- ✅ Modern UI with smooth toggle animations
- ✅ Session management and secure authentication
- ✅ Task management dashboard
- ✅ Fully responsive design
- ✅ Password visibility toggle
- ✅ Remember me functionality
- ✅ Form validation

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Authentication)
- **Icons**: Boxicons
- **Deployment**: GitHub Pages, Netlify, Vercel

## 📝 Configuration

Supabase configuration is located in `assets/js/config.js`.

### Setup Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key
3. Update `assets/js/config.js` with your credentials:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### Database Schema

The application requires the following tables in Supabase:

- `users` - User accounts
- `user_sessions` - Active user sessions
- `tasks` - Task items
- `notification_settings` - User notification preferences

## 🔧 Development

### Prerequisites

- A Supabase account and project
- A modern web browser
- (Optional) A local web server

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Duy133009/task-manager-login.git
   cd task-manager-login
   ```

2. Configure Supabase:
   - Update `assets/js/config.js` with your Supabase credentials
   - Set up the required database tables

3. Open in browser:
   - Simply open `index.html` in your browser, or
   - Use a local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     ```

4. Access the application:
   - Login page: `http://localhost:8000/index.html`
   - Dashboard: `http://localhost:8000/dashboard.html`

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- `docs/README.md` - Detailed documentation
- `docs/DEPLOY.md` - Deployment guide
- `docs/HUONG_DAN_DEPLOY.md` - Vietnamese deployment guide
- `docs/DEPLOY_QUICK.md` - Quick deployment guide

## 🚀 Deployment

This project can be deployed to:

- **GitHub Pages**: Automatically via GitHub Actions
- **Netlify**: Using `netlify.toml` configuration
- **Vercel**: Using `vercel.json` configuration

### GitHub Pages

1. Push code to GitHub
2. Go to repository Settings → Pages
3. Select source branch (usually `main`)
4. Your site will be available at `https://YOUR_USERNAME.github.io/task-manager-login/`

## 🔒 Security

- Passwords are hashed using SHA-256 before storage
- Session tokens are securely generated and stored
- All API keys should be kept in environment variables (not committed to Git)
- The `.gitignore` file excludes sensitive files

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**DuyTrinh**

- GitHub: [@Duy133009](https://github.com/Duy133009)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [Boxicons](https://boxicons.com) for the icon library
