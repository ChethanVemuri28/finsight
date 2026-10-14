
import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';

import { publish, MessageContext } from 'lightning/messageService';
import FINSIGHT_FILTER from
    '@salesforce/messageChannel/FinSightFilter__c';

import getMonthlySummary from
    '@salesforce/apex/FinSightDashboardController.getMonthlySummary';

const today = new Date();

export default class FinsightDashboard extends LightningElement {
    selectedMonth = String(today.getMonth() + 1);
    selectedYear = String(today.getFullYear());

    summary;
    errorMessage;
    isLoading = true;
    wiredResult;
    @wire(MessageContext)
    messageContext;
    initialPeriodPublished = false;

    monthOptions = [
        { label: 'January', value: '1' },
        { label: 'February', value: '2' },
        { label: 'March', value: '3' },
        { label: 'April', value: '4' },
        { label: 'May', value: '5' },
        { label: 'June', value: '6' },
        { label: 'July', value: '7' },
        { label: 'August', value: '8' },
        { label: 'September', value: '9' },
        { label: 'October', value: '10' },
        { label: 'November', value: '11' },
        { label: 'December', value: '12' }
    ];

    get yearOptions() {
        const currentYear = today.getFullYear();

        return Array.from({ length: 7 }, (_, index) => {
            const year = currentYear - 3 + index;
            return { label: String(year), value: String(year) };
        });
    }

    @wire(getMonthlySummary, {
        selectedMonth: '$selectedMonthNumber',
        selectedYear: '$selectedYearNumber'
    })
    wiredSummary(result) {
        this.wiredResult = result;

        if (result.data) {
            this.summary = result.data;
            this.errorMessage = undefined;
            this.isLoading = false;
        } else if (result.error) {
            this.summary = undefined;
            this.errorMessage =
                result.error?.body?.message ||
                'Unable to load the financial summary.';
            this.isLoading = false;
        }
    }

    
    get selectedMonthNumber() {
        return Number(this.selectedMonth);
    }

    get selectedYearNumber() {
        return Number(this.selectedYear);
    }

    get formattedIncome() {
        return this.formatCurrency(this.summary?.totalIncome);
    }

    get formattedExpenses() {
        return this.formatCurrency(this.summary?.totalExpenses);
    }

    get formattedSavings() {
        return this.formatCurrency(this.summary?.netSavings);
    }

    get formattedSavingsRate() {
        return `${Number(this.summary?.savingsRate || 0).toFixed(2)}%`;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value || 0);
    }

    handleMonthChange(event) {
        this.isLoading = true;
        this.selectedMonth = event.detail.value;
        this.publishSelectedPeriod();
    }

    handleYearChange(event) {
        this.isLoading = true;
        this.selectedYear = event.detail.value;
        this.publishSelectedPeriod();
    }

    async handleRefresh() {
        this.isLoading = true;

        try {
            await Promise.all([
                refreshApex(this.wiredResult),
            ]);
        } catch (error) {
            this.errorMessage =
                error?.body?.message || 'Refresh failed.';
        } finally {
            this.isLoading = false;
        }
    }

    publishSelectedPeriod() {
        publish(this.messageContext, FINSIGHT_FILTER, {
            selectedMonth: this.selectedMonthNumber,
            selectedYear: this.selectedYearNumber
        });
    }

    renderedCallback() {
        if (!this.initialPeriodPublished && this.messageContext) {
            this.initialPeriodPublished = true;
            this.publishSelectedPeriod();
        }
    }
}
