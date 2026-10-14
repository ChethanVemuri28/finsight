
public with sharing class TransactionController {

    @AuraEnabled(cacheable=true)
    public static List<Transaction__c> getTransactions() {
        return [
            SELECT Id,
                   Name,
                   Transaction_Date__c,
                   Amount__c,
                   Transaction_Type__c,
                   Category__c
            FROM Transaction__c
            WITH USER_MODE
            ORDER BY Transaction_Date__c DESC, CreatedDate DESC
            LIMIT 200
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Transaction__c> searchTransactions(
        String searchTerm,
        String transactionType,
        String category,
        Date startDate,
        Date endDate
    ) {

        if (startDate != null && endDate != null && startDate > endDate) {
            throw new AuraHandledException(
                'Start date cannot be after end date.'
            );
        }
        List<String> conditions = new List<String>();
        Map<String, Object> bindValues = new Map<String, Object>();

        if (String.isNotBlank(searchTerm)) {
            conditions.add('Name LIKE :searchPattern');
            bindValues.put(
                'searchPattern',
                '%' + searchTerm.trim() + '%'
            );
        }

        if (String.isNotBlank(transactionType)) {
            conditions.add('Transaction_Type__c = :transactionType');
            bindValues.put('transactionType', transactionType);
        }

        if (String.isNotBlank(category)) {
            conditions.add('Category__c = :category');
            bindValues.put('category', category);
        }

        if (startDate != null) {
            conditions.add('Transaction_Date__c >= :startDate');
            bindValues.put('startDate', startDate);
        }

        if (endDate != null) {
            conditions.add('Transaction_Date__c <= :endDate');
            bindValues.put('endDate', endDate);
        }

        String query =
            'SELECT Id, Name, Transaction_Date__c, Amount__c, ' +
            'Transaction_Type__c, Category__c ' +
            'FROM Transaction__c';

        if (!conditions.isEmpty()) {
            query += ' WHERE ' + String.join(conditions, ' AND ');
        }

        query +=
            ' ORDER BY Transaction_Date__c DESC, CreatedDate DESC ' +
            'LIMIT 200';

        return Database.queryWithBinds(
            query,
            bindValues,
            AccessLevel.USER_MODE
        );
    }

    @AuraEnabled
    public static Id createTransaction(
        String name,
        Date transactionDate,
        Decimal amount,
        String transactionType,
        String category,
        String description,
        Id financialAccountId
    ) {
        validateTransaction(
            name,
            transactionDate,
            amount,
            transactionType,
            category
        );

        Transaction__c transactionRecord = new Transaction__c(
            Name = name.trim(),
            Transaction_Date__c = transactionDate,
            Amount__c = amount,
            Transaction_Type__c = transactionType,
            Category__c = category
        );

        insert as user transactionRecord;

        return transactionRecord.Id;
    }

    @AuraEnabled
    public static void updateTransaction(
        Id transactionId,
        String name,
        Date transactionDate,
        Decimal amount,
        String transactionType,
        String category
    ) {
        if (transactionId == null) {
            throw new AuraHandledException(
                'Transaction ID is required.'
            );
        }

        validateTransaction(
            name,
            transactionDate,
            amount,
            transactionType,
            category
        );

        Transaction__c transactionRecord = new Transaction__c(
            Id = transactionId,
            Name = name.trim(),
            Transaction_Date__c = transactionDate,
            Amount__c = amount,
            Transaction_Type__c = transactionType,
            Category__c = category
        );

        update as user transactionRecord;
    }

    @AuraEnabled
    public static void deleteTransaction(Id transactionId) {
        if (transactionId == null) {
            throw new AuraHandledException(
                'Transaction ID is required.'
            );
        }

        Transaction__c transactionRecord = [
            SELECT Id
            FROM Transaction__c
            WHERE Id = :transactionId
            WITH USER_MODE
            LIMIT 1
        ];

        delete as user transactionRecord;
    }

    private static void validateTransaction(
        String name,
        Date transactionDate,
        Decimal amount,
        String transactionType,
        String category
    ) {
        if (String.isBlank(name)) {
            throw new AuraHandledException(
                'Transaction name is required.'
            );
        }

        if (transactionDate == null) {
            throw new AuraHandledException(
                'Transaction date is required.'
            );
        }

        if (amount == null || amount <= 0) {
            throw new AuraHandledException(
                'Amount must be greater than zero.'
            );
        }

        if (!new Set<String>{'Income', 'Expense'}
                .contains(transactionType)) {
            throw new AuraHandledException(
                'Select a valid transaction type.'
            );
        }

        if (String.isBlank(category)) {
            throw new AuraHandledException(
                'Category is required.'
            );
        }
    }
}
