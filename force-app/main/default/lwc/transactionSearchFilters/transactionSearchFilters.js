
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
    }

    handleTypeChange(event) {
        this.transactionType = event.detail.value;
    }

    handleCategoryChange(event) {
        this.category = event.detail.value;
    }

    handleStartDateChange(event) {
        const newDate = event.target.value || null;

        if (
            newDate &&
            this.endDate &&
            newDate > this.endDate
        ) {
            event.target.value = this.startDate || '';

            this.dispatchEvent(
                new CustomEvent('filtererror', {
                    detail: 'From Date cannot be later than To Date.'
                })
            );

            return;
        }

        this.startDate = newDate;
    }

    handleEndDateChange(event) {
        const newDate = event.target.value || null;

        if (
            newDate &&
            this.startDate &&
            newDate < this.startDate
        ) {
            event.target.value = this.endDate || '';

            this.dispatchEvent(
                new CustomEvent('filtererror', {
                    detail: 'To Date cannot be earlier than From Date.'
                })
            );

            return;
        }

        this.endDate = newDate;
    }

    handleClearFilters() {
        this.searchTerm = '';
        this.transactionType = '';
        this.category = '';
        this.startDate = null;
        this.endDate = null;
    }

    handleApplyFilters() {
        if (!this.messageContext) {
            return;
        }

        publish(this.messageContext, FINSIGHT_FILTER, {
            searchTerm: this.searchTerm.trim(),
            transactionType: this.transactionType,
            category: this.category,
            startDate: this.startDate,
            endDate: this.endDate
        });

        this.dispatchEvent(new CustomEvent('filterapply'));
    }
}
