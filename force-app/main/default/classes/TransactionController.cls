
public with sharing class TransactionController {

    @AuraEnabled(cacheable=true)
    public static List<Transaction__c> getTransactions() {
        return [
            SELECT Id,
                   Name,
                   Transaction_Date__c,
                   Amount__c,
                   Transaction_Type__c,
                   Category__c,
                   Description__c,
                   Financial_Account__c,
                   Financial_Account__r.Name
            FROM Transaction__c
            WITH USER_MODE
            ORDER BY Transaction_Date__c DESC, CreatedDate DESC
            LIMIT 200
        ];
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

        Transaction__c transactionRecord = new Transaction__c(
            Name = name.trim(),
            Transaction_Date__c = transactionDate,
            Amount__c = amount,
            Transaction_Type__c = transactionType,
            Category__c = category,
            Description__c = description,
            Financial_Account__c = financialAccountId
        );

        insert as user transactionRecord;

        return transactionRecord.Id;
    }
}
