
@IsTest
private class TransactionControllerTest {

    @TestSetup
    static void createTestData() {
        insert new List<Transaction__c>{
            new Transaction__c(
                Name = 'January Salary',
                Transaction_Date__c = Date.newInstance(2026, 1, 5),
                Amount__c = 50000,
                Transaction_Type__c = 'Income',
                Category__c = 'Salary'
            ),
            new Transaction__c(
                Name = 'January Food',
                Transaction_Date__c = Date.newInstance(2026, 1, 10),
                Amount__c = 3000,
                Transaction_Type__c = 'Expense',
                Category__c = 'Food'
            ),
            new Transaction__c(
                Name = 'January Housing',
                Transaction_Date__c = Date.newInstance(2026, 1, 15),
                Amount__c = 10000,
                Transaction_Type__c = 'Expense',
                Category__c = 'Housing'
            ),
            new Transaction__c(
                Name = 'February Salary',
                Transaction_Date__c = Date.newInstance(2026, 2, 5),
                Amount__c = 60000,
                Transaction_Type__c = 'Income',
                Category__c = 'Salary'
            )
        };
    }

    @IsTest
    static void testGetTransactions() {
        Test.startTest();
        List<Transaction__c> results =
            TransactionController.getTransactions();
        Test.stopTest();

        System.assertEquals(4, results.size());
        System.assertEquals(
            'February Salary',
            results[0].Name,
            'The newest transaction date should appear first.'
        );
    }

    @IsTest
    static void testSearchByName() {
        Test.startTest();
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                'Salary', null, null, null, null, null, null
            );
        Test.stopTest();

        System.assertEquals(2, results.size());

        for (Transaction__c record : results) {
            System.assert(
                record.Name.contains('Salary'),
                'Every result should match the search term.'
            );
        }
    }

    @IsTest
    static void testSearchByTransactionType() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null, 'Expense', null, null, null, null, null
            );

        System.assertEquals(2, results.size());

        for (Transaction__c record : results) {
            System.assertEquals(
                'Expense',
                record.Transaction_Type__c
            );
        }
    }

    @IsTest
    static void testSearchByCategory() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null, null, 'Food', null, null, null, null
            );

        System.assertEquals(1, results.size());
        System.assertEquals('January Food', results[0].Name);
    }

    @IsTest
    static void testSearchByDateRange() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null,
                null,
                null,
                Date.newInstance(2026, 1, 10),
                Date.newInstance(2026, 1, 15),
                null,
                null
            );

        System.assertEquals(
            2,
            results.size(),
            'Both date endpoints should be included.'
        );
    }

    @IsTest
    static void testSearchWithMultipleFilters() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                'January',
                'Expense',
                'Food',
                Date.newInstance(2026, 1, 1),
                Date.newInstance(2026, 1, 31),
                null,
                null
            );

        System.assertEquals(1, results.size());
        System.assertEquals('January Food', results[0].Name);
    }

    @IsTest
    static void testSearchWithoutFilters() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null, null, null, null, null, null, null
            );

        System.assertEquals(4, results.size());
    }

    @IsTest
    static void testSearchBySelectedMonthAndYear() {
        Test.startTest();

        List<Transaction__c> januaryResults =
            TransactionController.searchTransactions(
                null, null, null, null, null, 1, 2026
            );

        List<Transaction__c> februaryResults =
            TransactionController.searchTransactions(
                null, null, null, null, null, 2, 2026
            );

        Test.stopTest();

        System.assertEquals(
            3,
            januaryResults.size(),
            'January should contain three transactions.'
        );

        System.assertEquals(
            1,
            februaryResults.size(),
            'February should contain one transaction.'
        );

        for (Transaction__c record : januaryResults) {
            System.assertEquals(
                1,
                record.Transaction_Date__c.month(),
                'Every result must belong to January.'
            );

            System.assertEquals(
                2026,
                record.Transaction_Date__c.year()
            );
        }

        System.assertEquals(
            'February Salary',
            februaryResults[0].Name
        );
    }

    @IsTest
    static void testSearchByMonthWithOtherFilters() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null,
                'Expense',
                null,
                null,
                null,
                1,
                2026
            );

        System.assertEquals(
            2,
            results.size(),
            'January should return only its two expenses.'
        );

        for (Transaction__c record : results) {
            System.assertEquals(
                'Expense',
                record.Transaction_Type__c
            );

            System.assertEquals(
                1,
                record.Transaction_Date__c.month()
            );
        }
    }

    @IsTest
    static void testSearchForEmptyMonth() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null, null, null, null, null, 3, 2026
            );

        System.assertEquals(
            0,
            results.size(),
            'March has no test transactions.'
        );
    }

    @IsTest
    static void testSearchByMonthAndYearBoundary() {
        List<Transaction__c> januaryResults =
            TransactionController.searchTransactions(
                null, null, null, null, null, 1, 2026
            );

        List<Transaction__c> februaryResults =
            TransactionController.searchTransactions(
                null, null, null, null, null, 2, 2026
            );

        for (Transaction__c record : januaryResults) {
            System.assert(
                record.Transaction_Date__c <
                    Date.newInstance(2026, 2, 1),
                'January results must end before February.'
            );
        }

        for (Transaction__c record : februaryResults) {
            System.assert(
                record.Transaction_Date__c >=
                    Date.newInstance(2026, 2, 1),
                'February results must start in February.'
            );

            System.assert(
                record.Transaction_Date__c <
                    Date.newInstance(2026, 3, 1),
                'February results must end before March.'
            );
        }
    }

    @IsTest
    static void testInvalidDateRange() {
        Boolean exceptionThrown = false;

        try {
            TransactionController.searchTransactions(
                null,
                null,
                null,
                Date.newInstance(2026, 2, 1),
                Date.newInstance(2026, 1, 1),
                null,
                null
            );
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }

        System.assert(
            exceptionThrown,
            'Start date after end date should be rejected.'
        );
    }

    @IsTest
    static void testInvalidSelectedMonth() {
        assertSearchFails(
            null, null, null, null, null, 0, 2026
        );

        assertSearchFails(
            null, null, null, null, null, 13, 2026
        );
    }

    @IsTest
    static void testInvalidSelectedYear() {
        assertSearchFails(
            null, null, null, null, null, 1, 1999
        );

        assertSearchFails(
            null, null, null, null, null, 1, 2101
        );
    }

    @IsTest
    static void testNullPeriodStillAllowsAllTransactions() {
        List<Transaction__c> results =
            TransactionController.searchTransactions(
                null, null, null, null, null, null, null
            );

        System.assertEquals(
            4,
            results.size(),
            'Null month and year should not restrict the query.'
        );
    }

    @IsTest
    static void testCreateTransaction() {
        Test.startTest();

        Id transactionId =
            TransactionController.createTransaction(
                '  Freelance Income  ',
                Date.newInstance(2026, 3, 1),
                15000,
                'Income',
                'Other',
                'Freelance project',
                null
            );

        Test.stopTest();

        Transaction__c created = [
            SELECT Id, Name, Transaction_Date__c, Amount__c,
                   Transaction_Type__c, Category__c
            FROM Transaction__c
            WHERE Id = :transactionId
        ];

        System.assertEquals('Freelance Income', created.Name);
        System.assertEquals(
            Date.newInstance(2026, 3, 1),
            created.Transaction_Date__c
        );
        System.assertEquals(
            Decimal.valueOf('15000'),
            created.Amount__c
        );
        System.assertEquals('Income', created.Transaction_Type__c);
        System.assertEquals('Other', created.Category__c);
    }

    @IsTest
    static void testUpdateTransaction() {
        Transaction__c original = [
            SELECT Id
            FROM Transaction__c
            WHERE Name = 'January Food'
            LIMIT 1
        ];

        Test.startTest();

        TransactionController.updateTransaction(
            original.Id,
            'Updated Food',
            Date.newInstance(2026, 1, 12),
            4000,
            'Expense',
            'Food'
        );

        Test.stopTest();

        Transaction__c updated = [
            SELECT Name, Transaction_Date__c, Amount__c,
                   Transaction_Type__c, Category__c
            FROM Transaction__c
            WHERE Id = :original.Id
        ];

        System.assertEquals('Updated Food', updated.Name);
        System.assertEquals(
            Date.newInstance(2026, 1, 12),
            updated.Transaction_Date__c
        );
        System.assertEquals(
            Decimal.valueOf('4000'),
            updated.Amount__c
        );
        System.assertEquals('Expense', updated.Transaction_Type__c);
        System.assertEquals('Food', updated.Category__c);
    }

    @IsTest
    static void testDeleteTransaction() {
        Transaction__c original = [
            SELECT Id
            FROM Transaction__c
            WHERE Name = 'January Housing'
            LIMIT 1
        ];

        Test.startTest();
        TransactionController.deleteTransaction(original.Id);
        Test.stopTest();

        System.assertEquals(
            0,
            [
                SELECT COUNT()
                FROM Transaction__c
                WHERE Id = :original.Id
            ],
            'The transaction should be deleted.'
        );
    }

    @IsTest
    static void testCreateValidationErrors() {
        assertCreateFails(
            '', Date.today(), 100, 'Income', 'Salary',
            'Transaction name is required.'
        );

        assertCreateFails(
            'Missing Date', null, 100, 'Income', 'Salary',
            'Transaction date is required.'
        );

        assertCreateFails(
            'Zero Amount', Date.today(), 0, 'Income', 'Salary',
            'Amount must be greater than zero.'
        );

        assertCreateFails(
            'Negative Amount', Date.today(), -100, 'Expense', 'Food',
            'Amount must be greater than zero.'
        );

        assertCreateFails(
            'Invalid Type', Date.today(), 100, 'Transfer', 'Other',
            'Select a valid transaction type.'
        );

        assertCreateFails(
            'Missing Category', Date.today(), 100, 'Income', '',
            'Category is required.'
        );
    }

    @IsTest
    static void testUpdateRequiresId() {
        Boolean exceptionThrown = false;

        try {
            TransactionController.updateTransaction(
                null,
                'Updated',
                Date.today(),
                100,
                'Income',
                'Salary'
            );
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }

        System.assert(
            exceptionThrown,
            'Update should require a transaction ID.'
        );
    }

    @IsTest
    static void testDeleteRequiresId() {
        Boolean exceptionThrown = false;

        try {
            TransactionController.deleteTransaction(null);
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }

        System.assert(
            exceptionThrown,
            'Delete should require a transaction ID.'
        );
    }

    private static void assertSearchFails(
        String searchTerm,
        String transactionType,
        String category,
        Date startDate,
        Date endDate,
        Integer selectedMonth,
        Integer selectedYear
    ) {
        Boolean exceptionThrown = false;

        try {
            TransactionController.searchTransactions(
                searchTerm,
                transactionType,
                category,
                startDate,
                endDate,
                selectedMonth,
                selectedYear
            );
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }

        System.assert(
            exceptionThrown,
            'Invalid search criteria should be rejected.'
        );
    }

    private static void assertCreateFails(
        String name,
        Date transactionDate,
        Decimal amount,
        String transactionType,
        String category,
        String expectedMessage
    ) {
        Boolean exceptionThrown = false;

        try {
            TransactionController.createTransaction(
                name,
                transactionDate,
                amount,
                transactionType,
                category,
                null,
                null
            );
        } catch (AuraHandledException ex) {
            exceptionThrown = true;
        }

        System.assert(
            exceptionThrown,
            expectedMessage
        );
    }
}
