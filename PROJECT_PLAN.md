# BiteLine Project Plan

## 1. Project Overview

**Project Name:** BiteLine – Pre-Ordering & Queue Tracking Web App

BiteLine is a web application designed for restaurants, university canteens, cafeterias, and small food outlets.

The application allows customers to browse available food items, place an order before arriving at the food outlet, receive a queue or token number, and track the status of the order until it is ready for collection.

Staff members can manage incoming orders and update their status, while administrators can manage menu items, categories, users, and basic system information.

The main purpose of BiteLine is to reduce waiting time and improve the ordering process.

---

## 2. Problem Statement

In busy restaurants and university canteens, customers often spend a considerable amount of time waiting in queues to place orders and collect food.

This can result in:

- Long waiting times
- Crowded ordering areas
- Slow order processing
- Poor customer experience
- Difficulty tracking order progress

There is therefore a need for a simple online system that allows customers to place orders before arriving and track the progress of their orders.

---

## 3. Proposed Solution

BiteLine provides an online pre-ordering and queue tracking system.

Customers can:

- Register and log in
- Browse the available menu
- Search and filter food items
- Add items to a cart
- Place an order
- Receive an order or token number
- Track the order status
- View previous orders

Restaurant or canteen staff can:

- View incoming orders
- Accept orders
- Start preparing orders
- Mark orders as ready
- Mark collected orders as completed

Administrators can:

- Manage menu items
- Manage categories
- Manage item availability
- Manage staff accounts
- View basic system statistics

---

## 4. User Roles

### 4.1 Customer

The customer uses BiteLine to place and track food orders.

Main customer functions:

- Create account
- Log in
- Log out
- View menu
- Search menu
- Filter menu
- Add items to cart
- Update cart quantity
- Remove items from cart
- Place an order
- Receive order token
- Track order status
- View order history
- Cancel an eligible order

### 4.2 Staff

Staff members are responsible for managing customer orders.

Main staff functions:

- Log in
- View new orders
- Accept orders
- Change order status
- Mark orders as preparing
- Mark orders as ready
- Mark orders as completed

### 4.3 Administrator

The administrator controls the main application data.

Main administrator functions:

- Log in
- Add menu items
- Edit menu items
- Delete menu items
- Create and manage categories
- Change item availability
- Manage staff users
- View basic statistics

---

## 5. Core Features

### Authentication

- Customer registration
- Login
- Logout
- Password hashing
- JWT-based authentication
- Role-based access control

### Menu Management

- View available food items
- Search menu items
- Filter menu items by category
- View item details
- Add menu items
- Edit menu items
- Delete menu items
- Change item availability

### Shopping Cart

- Add item to cart
- Remove item from cart
- Change quantity
- Calculate total price
- Clear cart

### Order Management

- Create an order
- Generate order number
- Generate queue/token number
- Store ordered items
- Store total price
- View order details
- View order history
- Cancel an eligible order

### Queue Tracking

Order statuses:

1. Pending
2. Accepted
3. Preparing
4. Ready
5. Completed
6. Cancelled

Customers should be able to track these status changes from their order tracking page.

### Staff Dashboard

Staff members should be able to see orders grouped according to their current status.

Example:

- New Orders
- Preparing Orders
- Ready Orders
- Completed Orders

### Admin Dashboard

The administrator should be able to view basic information such as:

- Number of orders
- Pending orders
- Completed orders
- Number of menu items
- Number of registered users

---

## 6. Main User Flow

### Customer Flow

Home Page  
→ Register / Login  
→ Browse Menu  
→ Select Food  
→ Add to Cart  
→ Review Cart  
→ Place Order  
→ Receive Token Number  
→ Track Order  
→ Order Ready  
→ Collect Food  
→ Order Completed

### Staff Flow

Staff Login  
→ Staff Dashboard  
→ View New Orders  
→ Accept Order  
→ Mark Preparing  
→ Mark Ready  
→ Mark Completed

### Admin Flow

Admin Login  
→ Admin Dashboard  
→ Manage Menu  
→ Manage Categories  
→ Manage Staff  
→ View Statistics

---

## 7. Technology Stack

### Frontend

- React
- JavaScript
- HTML
- CSS
- Tailwind CSS if required

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Authentication

- JSON Web Token
- bcrypt

### API

- REST API

### Development Tools

- Visual Studio Code
- OpenAI Codex
- Git
- GitHub
- Postman
- MongoDB Compass
- Lovable for UI prototyping when required

---

## 8. Database Entities

### User

Fields:

- id
- name
- email
- password
- role
- createdAt
- updatedAt

Possible roles:

- customer
- staff
- admin

### Category

Fields:

- id
- name
- description

### MenuItem

Fields:

- id
- name
- description
- price
- category
- image
- available
- createdAt
- updatedAt

### Order

Fields:

- id
- user
- items
- totalAmount
- tokenNumber
- status
- createdAt
- updatedAt

### Order Item

Fields:

- menuItem
- name
- quantity
- price

---

## 9. REST API Plan

### Authentication APIs

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Menu APIs

```text
GET    /api/menu
GET    /api/menu/:id
POST   /api/menu
PUT    /api/menu/:id
DELETE /api/menu/:id
```

### Category APIs

```text
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Order APIs

```text
POST  /api/orders
GET   /api/orders/my-orders
GET   /api/orders/:id
PATCH /api/orders/:id/status
PATCH /api/orders/:id/cancel
```

### Staff APIs

```text
GET /api/staff/orders
```

### Admin APIs

```text
GET /api/admin/dashboard
GET /api/admin/users
```

Additional APIs can be added during development if required.

---

## 10. Proposed Project Folder Structure

```text
BiteLine/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── assets/
│   │
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── README.md
├── PROJECT_PLAN.md
└── .gitignore
```

The exact structure may be updated during development if necessary.

---

## 11. Development Stages

### Stage 1 – Project Planning

- Define project scope
- Define user roles
- Define core features
- Define application architecture
- Define database entities
- Define REST APIs

### Stage 2 – Project Setup

- Create frontend
- Create backend
- Configure Git
- Configure environment variables
- Configure basic project structure

### Stage 3 – Backend Foundation

- Create Express server
- Connect MongoDB
- Add basic middleware
- Add error handling

### Stage 4 – Authentication

- User model
- Registration
- Login
- Password hashing
- JWT authentication
- Role authorization

### Stage 5 – Menu Management

- Category model
- Menu item model
- Menu APIs
- Menu page
- Search and filtering
- Admin menu management

### Stage 6 – Cart

- Add to cart
- Remove from cart
- Update quantity
- Calculate totals

### Stage 7 – Order System

- Order model
- Create order
- Generate token number
- Order history
- Order details

### Stage 8 – Queue Tracking

- Staff dashboard
- Update order status
- Customer order tracking
- Pending
- Preparing
- Ready
- Completed

### Stage 9 – Admin Features

- Admin dashboard
- Menu management
- Category management
- Staff management
- Basic statistics

### Stage 10 – Testing

- Test authentication
- Test menu APIs
- Test order APIs
- Test permissions
- Test frontend forms
- Test error handling

### Stage 11 – UI Improvements

- Responsive design
- Loading states
- Error messages
- Empty states
- Improved navigation
- Improved accessibility

### Stage 12 – Deployment

- Deploy frontend
- Deploy backend
- Configure production database
- Configure environment variables
- Test deployed application

### Stage 13 – Final Documentation

- Update README
- Add screenshots
- Explain system architecture
- Document APIs
- Prepare project demonstration
- Review Git commit history
- Prepare viva questions

---

## 12. Initial MVP Scope

The first working version of BiteLine should include:

- User registration
- User login
- Menu browsing
- Cart
- Order creation
- Token number generation
- Order tracking
- Staff order management
- Admin menu management

Advanced features should only be added after the core application works correctly.

Possible future features include:

- Real-time updates using Socket.IO
- Estimated waiting time
- QR-based collection
- Email notifications
- Online payment
- Customer ratings
- Analytics
- Progressive Web App support

---

## 13. Development Approach

The application will be developed incrementally using Git and GitHub.

Each major feature should have its own meaningful commit.

Example:

```text
Initial project setup
Add React frontend
Create Express backend
Configure MongoDB connection
Implement user registration
Implement user login
Add JWT authentication
Create menu item model
Implement menu APIs
Build menu interface
Implement shopping cart
Create order API
Add queue token generation
Create staff dashboard
Implement order status tracking
Add admin menu management
Add application validation
Add tests
Prepare application for deployment
```

AI tools such as Codex will be used to assist with implementation, debugging, code review, testing, and explanations.

All AI-generated code should be reviewed, tested, and understood before being committed to the repository.