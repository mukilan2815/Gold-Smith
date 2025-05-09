
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Performance Note: Firestore Indexes

For optimal performance, especially when listing and filtering data, ensure that you have created the necessary Firestore indexes. Queries involving sorting (`orderBy`) or filtering (`where`) on multiple fields often require composite indexes.

Please refer to the [Firestore Index Guide](./firestore.indexes.md) for a list of recommended indexes for this application. Missing these indexes can lead to significantly slower data retrieval.
