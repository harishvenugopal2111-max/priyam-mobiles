📱 PRIYAM MOBILES – Mobile Shop Management System
📖 Overview

PRIYAM MOBILES is a comprehensive Mobile Shop Management System designed to streamline inventory management, sales tracking, customer management, and business operations for mobile retail stores. The application helps shop owners efficiently manage products, monitor stock levels, record sales transactions, and generate business insights through an intuitive dashboard.

This project is built as a full-stack web application with modern UI/UX and database-driven CRUD operations.

🎯 Objectives
Manage mobile inventory efficiently
Track sales and customer purchases
Monitor stock availability
Simplify business operations
Generate sales reports and analytics
Improve customer service and management
✨ Features
📦 Inventory Management
📱 Mobile Product Management
👥 Customer Management
🛒 Sales Tracking
✏️ Update Product Details
❌ Delete Products
🔍 Search & Filter Products
📊 Business Dashboard
📈 Sales Analytics
🔐 Admin Authentication
📱 Responsive Design
🏗️ Tech Stack
Frontend
React.js
HTML5
CSS3
JavaScript
Tailwind CSS
Backend
Node.js
Express.js
Database
MySQL
Deployment
Vercel
GitHub
🏛️ System Architecture
Customer
   │
   ▼
Frontend (React.js)
   │
   ▼
Node.js + Express Backend
   │
   ▼
MySQL Database
   │
 ┌─┴─────────────┐
 ▼               ▼
Products      Sales Records
📂 Project Structure
priyam-mobiles/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── config/
│   └── server.js
│
├── database/
│   └── priyam_mobiles.sql
│
├── screenshots/
├── README.md
└── .env
⚙️ Installation
Clone Repository
git clone https://github.com/your-username/priyam-mobiles.git

cd priyam-mobiles
Backend Setup
cd server

npm install

npm start
Frontend Setup
cd client

npm install

npm run dev
🔑 Environment Variables

Create a .env file:

PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=priyam_mobiles

JWT_SECRET=your_secret_key
🗄️ Database Modules
Products
Field	Type
id	INT
brand	VARCHAR
model	VARCHAR
price	DECIMAL
stock	INT
category	VARCHAR
Customers
Field	Type
id	INT
name	VARCHAR
phone	VARCHAR
address	TEXT
Sales
Field	Type
id	INT
customer_id	INT
product_id	INT
quantity	INT
total_amount	DECIMAL
sale_date	DATE
🔄 Workflow
Admin logs into the system.
Mobile products are added to inventory.
Customers purchase products.
Sales records are stored in the database.
Stock quantity is updated automatically.
Dashboard displays business statistics.
Reports help analyze sales performance.
📊 Dashboard Features
Admin Dashboard
Total Products
Available Stock
Total Customers
Total Sales
Revenue Summary
Inventory Management
Add Product
Edit Product
Delete Product
Update Stock
Sales Management
Record Sales
Generate Bills
Sales History
Revenue Tracking
🔒 Security Features
Admin Authentication
Protected Routes
Secure Database Connectivity
Input Validation
Error Handling
🚀 Future Enhancements
Online Shopping Module
QR Code Billing
GST Invoice Generation
Customer Loyalty Program
SMS Notifications
Payment Gateway Integration
AI-Based Sales Prediction
Multi-Branch Management
📍 Business Information

Shop Name: PRIYAM MOBILES
Location: Perumulai, Titakudi, Tamil Nadu, India

🎓 Academic Relevance

This project demonstrates concepts in:

Full Stack Web Development
Database Management Systems
CRUD Operations
Inventory Management
Sales Analytics
Business Automation
👨‍💻 Developer

Harish Venugopal
B.Tech Artificial Intelligence & Data Science

Connect With Me
GitHub: https://github.com/harishvenugopal
LinkedIn: https://www.linkedin.com/in/harish-venugopal-4a06b1272
⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.

📱 PRIYAM MOBILES

"Smart Inventory. Better Sales. Faster Growth." 🚀
