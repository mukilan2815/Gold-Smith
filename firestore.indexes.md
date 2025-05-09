
# Firestore Indexes for Goldsmith Assistant Application

Proper Firestore indexes are crucial for query performance. If you are experiencing slow data loading or saving, please ensure the following indexes are created in your Firebase project's Firestore console.

Go to your Firebase Console -> Firestore Database -> Indexes.

## 1. ClientDetails Collection

*   **Index 1:**
    *   **Collection ID:** `ClientDetails`
    *   **Fields to index:**
        *   `createdAt` (Order: Descending)
    *   **Query scope:** Collection
    *   **Purpose:** Used for sorting clients by the most recent in "Client Receipt - Select Client", "Customer Details - Select Client", and "Admin Receipt - Select Client" pages.

## 2. ClientReceipts Collection

*   **Index 1:**
    *   **Collection ID:** `ClientReceipts`
    *   **Fields to index:**
        *   `createdAt` (Order: Descending)
    *   **Query scope:** Collection
    *   **Purpose:** Used for sorting client receipts by the most recent in the "Client Bill" page.

*   **Index 2 (Composite Index):**
    *   **Collection ID:** `ClientReceipts`
    *   **Fields to index:**
        *   `clientId` (Order: Ascending)
        *   `createdAt` (Order: Descending)
    *   **Query scope:** Collection
    *   **Purpose:** Used for fetching and sorting receipts for a specific client in the "Customer Details - View" page.

## 3. AdminReceipts Collection

*   **Index 1:**
    *   **Collection ID:** `AdminReceipts`
    *   **Fields to index:**
        *   `createdAt` (Order: Descending)
    *   **Query scope:** Collection
    *   **Purpose:** Used for sorting admin receipts by the most recent in the "Admin Bill - View Receipts" and "Admin Details" pages.

**How to Create Indexes:**

1.  Open your Firebase project in the Firebase Console.
2.  Navigate to **Firestore Database** from the left-hand menu.
3.  Click on the **Indexes** tab.
4.  Click on **Add index**.
5.  Enter the **Collection ID**.
6.  Add the **Fields to index** one by one, specifying the correct order (Ascending/Descending).
7.  Set the **Query scope** to "Collection".
8.  Click **Create**.

Firestore might take a few minutes to build the indexes. You can monitor their status in the console.

**Important Notes:**

*   Firestore often automatically creates single-field ascending indexes. However, for descending order or composite indexes, manual creation is required.
*   If Firestore Console provides a link in an error message in your Firebase Functions logs or client-side console suggesting an index, you can often click that link to pre-fill the index creation form.
*   Missing or improperly configured indexes are a common cause of slow query performance in Firestore.
