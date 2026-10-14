
import { LightningElement, wire } from 'lwc';
import {
    MessageContext,
    publish
} from 'lightning/messageService';

import FINSIGHT_FILTER from
    '@salesforce/messageChannel/FinSightFilter__c';

export default class TransactionSearchFilters extends LightningElement {
    searchTerm = '';
    transactionType = '';
    category = '';
    startDate = null;
    endDate = null;

    transactionTypeOptions = [
        { label: 'All Types', value: '' },
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];

    categoryOptions = [
        { label: 'All Categories', value: '' },
        { label: 'Salary', value: 'Salary' },
        { label: 'Food', value: 'Food' },
        { label: 'Housing', value: 'Housing' },
        { label: 'Transport', value: 'Transport' },
        { label: 'Utilities', value: 'Utilities' },
        { label: 'Shopping', value: 'Shopping' },
        { label: 'Healthcare', value: 'Healthcare' },
        { label: 'Investment', value: 'Investment' },
        { label: 'Entertainment', value: 'Entertainment' },
        { label: 'Other', value: 'Other' }
    ];

    @wire(MessageContext)
    messageContext;

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
        this.publishFilters();
    }

    handleTypeChange(event) {
        this.transactionType = event.detail.value;
        this.publishFilters();
    }

    handleCategoryChange(event) {
        this.category = event.detail.value;
        this.publishFilters();
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value || null;

        if (!this.validateDateRange()) {
            event.target.value = '';
            this.startDate = null;
            return;
        }

        this.publishFilters();
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value || null;

        if (!this.validateDateRange()) {
            event.target.value = '';
            this.endDate = null;
            return;
        }

        this.publishFilters();
    }

    validateDateRange() {
        if (
            this.startDate &&
            this.endDate &&
            this.startDate > this.endDate
        ) {
            this.dispatchEvent(
                new CustomEvent('filtererror', {
                    detail: 'From Date cannot be later than To Date.'
                })
            );

            return false;
        }

        return true;
    }

    handleClearFilters() {
        this.searchTerm = '';
        this.transactionType = '';
        this.category = '';
        this.startDate = null;
        this.endDate = null;

        this.publishFilters();
    }

    publishFilters() {
        publish(this.messageContext, FINSIGHT_FILTER, {
            searchTerm: this.searchTerm,
            transactionType: this.transactionType,
            category: this.category,
            startDate: this.startDate,
            endDate: this.endDate
        });
    }
}
