# **App Name**: Goldsmith Assistant

## Core Features:

- Dynamic Table UI: Implement a clean and user-friendly interface for the receipt page (page 2) with a dynamic table for item details, ensuring easy data entry and clear presentation of calculations (Net weight and Final weight).
- Client Data Filtering: Implement a searchable and filterable display of client data. The search filters should include Shop Name, Client Name, and Phone Number.
- Validated Client Form: Implement a form layout for the 'New Client Page' with input validation to match the field requirements (max lengths, numeric phone number, alphanumeric address).

## Style Guidelines:

- Primary color: Gold (#FFD700) to reflect the Goldsmith theme.
- Secondary color: Cream or off-white (#FFFDD0) for backgrounds to provide a soft, clean look.
- Accent: Teal (#008080) for interactive elements to provide contrast and highlight actions.
- Use a consistent grid layout for all pages to maintain visual structure and alignment.
- Use simple and elegant icons for the sidebar menu items, using a consistent style throughout the application.

## Original User Request:
Create a Goldsmith Desktop Application using Firebase Authentication and Firestore (NoSQL). The app should include the following features:

1. **Authentication System**:
   - Sign-Up Page:
     - Fields: Name (string, max 50 chars), Phone Number (numeric), User ID (string, max 50 chars), Password (must contain 1 uppercase, minimum 8 characters, and 1 number).
     - Save user data in the "Users" collection in Firestore.
     - Use Firebase Authentication for sign-up.
   - Login Page:
     - Fields: User ID, Password.
     - Forgot Password: Send OTP to the phone number from the "Users" collection. If OTP matches, allow the user to reset the password. Update password in Firebase Auth.
   - Buttons for "Create Account" and "Login".

2. **Home Page (Dashboard)**:
   - Left Sidebar with options:
     - New Client
     - Receipt
     - Bill
     - Customer Details
     - Admin Details
     - Logout
   - Center area should display a placeholder image that can be changed later.

3. **New Client Page**:
   - Form Fields:
     - Shop Name (string, max 50)
     - Client Name (string, max 50)
     - Phone Number (numeric)
     - Address (text, alphanumeric + special characters)
   - Save button to store data in Firestore under the "Clients" collection.

4. **Receipt Page**:
   - Page 1:
     - Display clients from the "Clients" collection sorted by most recent.
     - Add filters: Shop Name, Client Name, Phone Number.
     - On client selection, navigate to Page 2.
   - Page 2:
     - Show selected Client Name.
     - Fields: Issue Date (date), Metal (dropdown: Gold, Silver, Diamond), Weight (decimal + unit dropdown: mg, g, kg).
     - Dynamic Table:
       - Columns: S.No, Item Name, Tag, Gross (wt), Stone (wt), Net (wt), Melting / Touch, Final (wt), Stone Amt.
       - Editable rows.
       - Calculations:
         - Net (wt) = Gross (wt) - Stone (wt)
         - Final (wt) = Net (wt) * (Melting / Touch ÷ 100), show 3 digits after decimal.
       - Last row: Show total sum for all numeric columns.
     - Button "Create Receipt" to save receipt in Firestore under "Receipts" collection.
     - Each client can have multiple receipts.
     - Display final summary:
       ```
       Name: [Client Name]
       Date: [Issue Date]
       Metals: [Metal Type]
       Weight: [Weight]
       And Table
       ```

5. **Bill Page**:
   - Display all receipts from "Receipts" collection.
   - Filter receipts by Shop Name, Client Name, Phone Number.

6. **Customer Details & Admin Details Pages**:
   - Only create frontend layout (no functionality required yet).

Use Firebase Firestore instead of SQL. Use Firebase Authentication for all auth flows. Use Firestore collections: Users, Clients, Receipts.
  