
public with sharing class FinSightDashboardController {

    public class DashboardSummary {
        @AuraEnabled public Decimal totalIncome { get; set; }
        @AuraEnabled public Decimal totalExpenses { get; set; }
        @AuraEnabled public Decimal netSavings { get; set; }
        @AuraEnabled public Decimal savingsRate { get; set; }

        public DashboardSummary() {
            totalIncome = 0;
            totalExpenses = 0;
            netSavings = 0;
            savingsRate = 0;
        }
    }

    @AuraEnabled(cacheable=true)
    public static DashboardSummary getMonthlySummary(
        Integer selectedMonth,
        Integer selectedYear
    ) {
        if (selectedMonth == null || selectedMonth < 1 ||
            selectedMonth > 12 || selectedYear == null ||
            selectedYear < 2000 || selectedYear > 2100) {
            throw new AuraHandledException(
                'Select a valid month and year.'
            );
        }

        Date startDate = Date.newInstance(
            selectedYear, selectedMonth, 1
        );
        Date endDate = startDate.addMonths(1);

        DashboardSummary summary = new DashboardSummary();

        for (AggregateResult result : [
            SELECT Transaction_Type__c transactionType,
                   SUM(Amount__c) totalAmount
            FROM Transaction__c
            WHERE Transaction_Date__c >= :startDate
              AND Transaction_Date__c < :endDate
            WITH USER_MODE
            GROUP BY Transaction_Type__c
        ]) {
            String transactionType =
                (String) result.get('transactionType');
            Decimal totalAmount =
                (Decimal) result.get('totalAmount');

            if (totalAmount == null) {
                totalAmount = 0;
            }

            if (transactionType == 'Income') {
                summary.totalIncome = totalAmount;
            } else if (transactionType == 'Expense') {
                summary.totalExpenses = totalAmount;
            }
        }

        summary.netSavings =
            summary.totalIncome - summary.totalExpenses;

        if (summary.totalIncome > 0) {
            summary.savingsRate =
                (summary.netSavings / summary.totalIncome) * 100;
        }

        return summary;
    }

    
    @AuraEnabled(cacheable=true)
    public static List<CategoryExpense> getMonthlyExpensesByCategory(
        Integer selectedMonth,
        Integer selectedYear
    ) {
        if (selectedMonth == null || selectedMonth < 1 ||
            selectedMonth > 12 || selectedYear == null ||
            selectedYear < 2000 || selectedYear > 2100) {
            throw new AuraHandledException(
                'Select a valid month and year.'
            );
        }

        Date startDate = Date.newInstance(
            selectedYear, selectedMonth, 1
        );
        Date endDate = startDate.addMonths(1);

        List<CategoryExpense> expenses = new List<CategoryExpense>();

        for (AggregateResult result : [
            SELECT Category__c category,
                   SUM(Amount__c) totalAmount
            FROM Transaction__c
            WHERE Transaction_Type__c = 'Expense'
              AND Transaction_Date__c >= :startDate
              AND Transaction_Date__c < :endDate
            WITH USER_MODE
            GROUP BY Category__c
            ORDER BY SUM(Amount__c) DESC
        ]) {
            CategoryExpense item = new CategoryExpense();
            item.category = (String) result.get('category');
            item.totalAmount = (Decimal) result.get('totalAmount');

            expenses.add(item);
        }

        return expenses;
    }

    public class CategoryExpense {
        @AuraEnabled public String category { get; set; }
        @AuraEnabled public Decimal totalAmount { get; set; }
    }

}
