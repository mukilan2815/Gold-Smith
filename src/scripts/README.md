# Database Migration Scripts

## Update Client Bills Script

### Purpose
The `update-client-bills.js` script is a migration utility that updates all existing client bills with the correct client information from the clients collection.

## Fix Client Bills Script

### Purpose
The `fix-client-bills.js` script is a migration utility that fixes client bills with invalid clientIds and missing clientInfo fields.

### What it does
1. Connects to the MongoDB database
2. Finds all client bills
3. For each bill:
   a. If clientId is invalid (e.g., "temp-hdgbjzs64"), updates it to use clientName directly
   b. If clientInfo fields are empty, populates them from the client collection if possible
   c. Ensures clientName is always available in clientInfo
4. Saves the updated bill

### How to run
To run the script, use Node.js directly:

```bash
node src/scripts/fix-client-bills.js
```

### Implementation Notes
- The script is implemented in JavaScript (not TypeScript) to avoid compilation issues
- The script defines the necessary Mongoose schemas directly to avoid import issues
- No external dependencies are required beyond Mongoose
- The script will output progress information and a summary of updated, skipped, and error counts
5. Saves the updated bill

### How to run
To run the script, use Node.js directly:

```bash
node src/scripts/update-client-bills.js
```

### Implementation Notes
- The script is implemented in JavaScript (not TypeScript) to avoid compilation issues
- The script defines the necessary Mongoose schemas directly to avoid import issues
- No external dependencies are required beyond Mongoose
- The script will output progress information and a summary of updated, skipped, and error counts

### Troubleshooting
If you encounter connection issues, verify that:
1. MongoDB is running and accessible
2. The connection string in the script is correct (defaults to `mongodb://localhost:27017/goldsmith`)
3. You have the necessary permissions to access the database

If you need to use a different connection string, you can set the `MONGODB_URI` environment variable before running the script.