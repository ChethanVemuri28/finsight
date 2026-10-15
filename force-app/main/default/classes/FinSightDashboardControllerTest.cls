@IsTest
private class FinSightDashboardControllerTest {

    @TestSetup
    static void createTestData() {
        List<Transaction__c> transactions = new List<Transaction__c>();

        // January 2026: Income
        transactions.add(new Transaction__c(
            Name = 'January Salary',
            Transaction_Date__c = Date.newInstance(2026, 1, 5),
            Amount__c = 50000,
            Transaction_Type__c = 'Income',
            Category__c = 'Salary'
        ));

        // January 2026: Expenses
        transactions.add(new Transaction__c(
            Name = 'January Food',
            Transaction_Date__c = Date.newInstance(2026, 1, 10),
            Amount__c = 3000,
            Transaction_Type__c = 'Expense',
            Category__c = 'Food'
        ));

        transactions.add(new Transaction__c(
            Name = 'January Housing',
            Transaction_Date__c = Date.newInstance(2026, 1, 15),
            Amount__c = 10000,
            Transaction_Type__c = 'Expense',
            Category__c = 'Housing'
        ));

        // February 2026: Separate month for boundary testing
        transactions.add(new Transaction__c(
            Name = 'February Salary',
            Transaction_Date__c = Date.newInstance(2026, 2, 1),
            Amount__c = 60000,
            Transaction_Type__c = 'Income',
            Category__c = 'Salary'
        ));

        transactions.add(new Transaction__c(
            Name = 'February Transport',
            Transaction_Date__c = Date.newInstance(2026, 2, 1),
            Amount__c = 2000,
            Transaction_Type__c = 'Expense',
            Category__c = 'Transport'
        ));

        insert transactions;
    }

    @IsTest
    static void testMonthlySummary() {
        Test.startTest();
        FinSightDashboardController.DashboardSummary summary =
            FinSightDashboardController.getMonthlySummary(1, 2026);
        Test.stopTest();

        System.assertEquals(
            Decimal.valueOf('50000'),
            summary.totalIncome,
            'January income should total 50000.'
        );

        System.assertEquals(
            Decimal.valueOf('13000'),
            summary.totalExpenses,
            'January expenses should total 13000.'
        );

        System.assertEquals(
            Decimal.valueOf('37000'),
            summary.netSavings,
            'Net savings should be income minus expenses.'
        );

        System.assertEquals(
            (Decimal.valueOf('37000') / Decimal.valueOf('50000')) * 100,
            summary.savingsRate,
            'Savings rate should be calculated as a percentage of income.'
        );
    }

    @IsTest
    static void testMonthlyExpensesByCategory() {
        Test.startTest();
        List<FinSightDashboardController.CategoryExpense> expenses =
            FinSightDashboardController.getMonthlyExpensesByCategory(1, 2026);
        Test.stopTest();

        System.assertEquals(
            2,
            expenses.size(),
            'January should contain two expense categories.'
        );

        System.assertEquals(
            'Housing',
            expenses[0].category,
            'The highest expense category should be first.'
        );

        System.assertEquals(
            Decimal.valueOf('10000'),
            expenses[0].totalAmount,
            'Housing expenses should total 10000.'
        );

        System.assertEquals(
            'Food',
            expenses[1].category,
            'Food should be the second category.'
        );

        System.assertEquals(
            Decimal.valueOf('3000'),
            expenses[1].totalAmount,
            'Food expenses should total 3000.'
        );
    }

    @IsTest
    static void testMonthBoundary() {
        FinSightDashboardController.DashboardSummary january =
            FinSightDashboardController.getMonthlySummary(1, 2026);

        FinSightDashboardController.DashboardSummary february =
            FinSightDashboardController.getMonthlySummary(2, 2026);

        System.assertEquals(
            Decimal.valueOf('50000'),
            january.totalIncome,
            'January should not include February income.'
        );

        System.assertEquals(
            Decimal.valueOf('60000'),
            february.totalIncome,
            'February should include its own income.'
        );

        System.assertEquals(
            Decimal.valueOf('2000'),
            february.totalExpenses,
            'February should include its own expenses.'
        );
    }

    @IsTest
    static void testEmptyMonthSummary() {
        FinSightDashboardController.DashboardSummary summary =
            FinSightDashboardController.getMonthlySummary(3, 2026);

        System.assertEquals(Decimal.valueOf('0'), summary.totalIncome);
        System.assertEquals(Decimal.valueOf('0'), summary.totalExpenses);
        System.assertEquals(Decimal.valueOf('0'), summary.netSavings);
        System.assertEquals(Decimal.valueOf('0'), summary.savingsRate);
    }

    @IsTest
    static void testEmptyMonthCategories() {
        List<FinSightDashboardController.CategoryExpense> expenses =
            FinSightDashboardController.getMonthlyExpensesByCategory(3, 2026);

        System.assertEquals(
            0,
            expenses.size(),
            'A month without transactions should return no expense categories.'
        );
    }

    @IsTest
    static void testInvalidMonth() {
        List<Integer> invalidMonths = new List<Integer>{0, 13};

        for (Integer monthValue : invalidMonths) {
            Boolean exceptionThrown = false;

            try {
                FinSightDashboardController.getMonthlySummary(monthValue, 2026);
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }

            System.assert(
                exceptionThrown,
                'An invalid month should throw AuraHandledException.'
            );
        }
    }

    @IsTest
    static void testInvalidYear() {
        List<Integer> invalidYears = new List<Integer>{1999, 2101};

        for (Integer yearValue : invalidYears) {
            Boolean exceptionThrown = false;

            try {
                FinSightDashboardController.getMonthlySummary(1, yearValue);
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }

            System.assert(
                exceptionThrown,
                'An invalid year should throw AuraHandledException.'
            );
        }
    }

    @IsTest
    static void testNullInputs() {
        Boolean summaryExceptionThrown = false;
        Boolean categoryExceptionThrown = false;

        try {
            FinSightDashboardController.getMonthlySummary(null, 2026);
        } catch (AuraHandledException ex) {
            summaryExceptionThrown = true;
        }

        try {
            FinSightDashboardController.getMonthlyExpensesByCategory(1, null);
        } catch (AuraHandledException ex) {
            categoryExceptionThrown = true;
        }

        System.assert(summaryExceptionThrown, 'Null month should be rejected.');
        System.assert(categoryExceptionThrown, 'Null year should be rejected.');
    }
}