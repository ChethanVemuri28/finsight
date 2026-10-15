
import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import LightningConfirm from 'lightning/confirm';

import {
    MessageContext,
    subscribe,
    unsubscribe,
    publish,
    APPLICATION_SCOPE
} from 'lightning/messageService';

import FINSIGHT_FILTER from
    '@salesforce/messageChannel/FinSightFilter__c';

import searchTransactions from
    '@salesforce/apex/TransactionController.searchTransactions';
import updateTransaction from
    '@salesforce/apex/TransactionController.updateTransaction';
import deleteTransaction from
    '@salesforce/apex/TransactionController.deleteTransaction';

const today = new Date();

const COLUMNS = [
    { label: 'Name', fieldName: 'Name' },
    {
        label: 'Date',
        fieldName: 'Transaction_Date__c',
        type: 'date'
    },
    {
        label: 'Amount',
        fieldName: 'Amount__c',
        type: 'currency',
        typeAttributes: { currencyCode: 'INR' }
    },
    { label: 'Type', fieldName: 'Transaction_Type__c' },
    { label: 'Category', fieldName: 'Category__c' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [
                { label: 'Edit', name: 'edit' },
                { label: 'Delete', name: 'delete' }
            ]
        }
    }
];

export default class RecentTransactions extends LightningElement {
    columns = COLUMNS;
    transactions = [];
    wiredTransactionsResult;

    isLoading = true;
    isSaving = false;
    isEditModalOpen = false;
    isFilterModalOpen = false;
    editingTransactionId;

    editName = '';
    editDate = '';
    editAmount = '';
    editType = 'Expense';
    editCategory = 'Other';

    searchTerm = '';
    transactionType = '';
    category = '';
    startDate = null;
    endDate = null;

    // Default period matches the dashboard's initial period.
    selectedMonth = today.getMonth() + 1;
    selectedYear = today.getFullYear();

    subscription;
    lastRefreshToken;

    transactionTypeOptions = [
        { label: 'Income', value: 'Income' },
        { label: 'Expense', value: 'Expense' }
    ];

    categoryOptions = [
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

    connectedCallback() {
        this.subscribeToFilters();
    }

    renderedCallback() {
        // The message context may not have been available
        // when connectedCallback first ran.
        if (!this.subscription && this.messageContext) {
            this.subscribeToFilters();
        }
    }

    disconnectedCallback() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
    }

    subscribeToFilters() {
        if (this.subscription || !this.messageContext) {
            return;
        }

        this.subscription = subscribe(
            this.messageContext,
            FINSIGHT_FILTER,
            message => this.handleFilterMessage(message),
            { scope: APPLICATION_SCOPE }
        );
    }

    handleFilterMessage(message) {
        let filtersChanged = false;

        // Dashboard financial period.
        if (message.selectedMonth !== undefined) {
            const month = Number(message.selectedMonth);

            if (
                month >= 1 &&
                month <= 12 &&
                month !== this.selectedMonth
            ) {
                this.selectedMonth = month;
                filtersChanged = true;
            }
        }

        if (message.selectedYear !== undefined) {
            const year = Number(message.selectedYear);

            if (
                year >= 2000 &&
                year <= 2100 &&
                year !== this.selectedYear
            ) {
                this.selectedYear = year;
                filtersChanged = true;
            }
        }

        // Search and filter criteria.
        if (
            message.searchTerm !== undefined &&
            message.searchTerm !== this.searchTerm
        ) {
            this.searchTerm = message.searchTerm || '';
            filtersChanged = true;
        }

        if (
            message.transactionType !== undefined &&
            message.transactionType !== this.transactionType
        ) {
            this.transactionType = message.transactionType || '';
            filtersChanged = true;
        }

        if (
            message.category !== undefined &&
            message.category !== this.category
        ) {
            this.category = message.category || '';
            filtersChanged = true;
        }

        if (
            message.startDate !== undefined &&
            message.startDate !== this.startDate
        ) {
            this.startDate = message.startDate || null;
            filtersChanged = true;
        }

        if (
            message.endDate !== undefined &&
            message.endDate !== this.endDate
        ) {
            this.endDate = message.endDate || null;
            filtersChanged = true;
        }

        if (filtersChanged) {
            this.isLoading = true;
        }

        // Refresh after another component creates or changes a record.
        if (
            message.refreshTransactions &&
            message.refreshTransactions !== this.lastRefreshToken
        ) {
            this.lastRefreshToken = message.refreshTransactions;
            this.refreshTransactionList();
        }
    }

    @wire(searchTransactions, {
        searchTerm: '$searchTerm',
        transactionType: '$transactionType',
        category: '$category',
        startDate: '$startDate',
        endDate: '$endDate',
        selectedMonth: '$selectedMonth',
        selectedYear: '$selectedYear'
    })
    wiredTransactionData(result) {
        this.wiredTransactionsResult = result;

        if (result.data) {
            this.transactions = result.data;
            this.isLoading = false;
        } else if (result.error) {
            this.transactions = [];
            this.isLoading = false;

            this.showToast(
                'Unable to Load Transactions',
                this.getErrorMessage(result.error),
                'error'
            );
        }
    }

    get isEmpty() {
        return !this.isLoading && this.transactions.length === 0;
    }

    get filterModalClass() {
        return this.isFilterModalOpen
            ? 'slds-modal slds-fade-in-open'
            : 'slds-modal';
    }

    openFilterModal() {
        this.isFilterModalOpen = true;
    }

    closeFilterModal() {
        this.isFilterModalOpen = false;
    }

    handleFilterApply() {
        this.isFilterModalOpen = false;
    }

    handleFilterError(event) {
        this.showToast(
            'Invalid Date Range',
            event.detail,
            'error'
        );
    }

    handleResetFilters() {
        publish(this.messageContext, FINSIGHT_FILTER, {
            searchTerm: '',
            transactionType: '',
            category: '',
            startDate: null,
            endDate: null
        });
    }

    handleRowAction(event) {
        const action = event.detail.action.name;
        const record = event.detail.row;

        if (action === 'edit') {
            this.openEditModal(record);
        } else if (action === 'delete') {
            this.handleDelete(record);
        }
    }

    openEditModal(record) {
        this.editingTransactionId = record.Id;
        this.editName = record.Name || '';
        this.editDate = record.Transaction_Date__c;
        this.editAmount = String(record.Amount__c ?? '');
        this.editType = record.Transaction_Type__c || 'Expense';
        this.editCategory = record.Category__c || 'Other';
        this.isEditModalOpen = true;
    }

    handleEditInputChange(event) {
        const field = event.target.dataset.field;

        if (field) {
            this[field] = event.target.value;
        }
    }

    closeEditModal() {
        this.isEditModalOpen = false;
        this.editingTransactionId = undefined;
    }

    validateEditForm() {
        const inputs = [
            ...this.template.querySelectorAll(
                '.edit-form lightning-input, ' +
                '.edit-form lightning-combobox'
            )
        ];

        const valid = inputs.reduce(
            (allValid, input) => input.reportValidity() && allValid,
            true
        );

        if (!valid) {
            return false;
        }

        if (
            !Number.isFinite(Number(this.editAmount)) ||
            Number(this.editAmount) <= 0
        ) {
            this.showToast(
                'Invalid Amount',
                'Enter an amount greater than zero.',
                'error'
            );
            return false;
        }

        return true;
    }

    async handleUpdate() {
        if (!this.validateEditForm()) {
            return;
        }

        this.isSaving = true;

        try {
            await updateTransaction({
                transactionId: this.editingTransactionId,
                name: this.editName.trim(),
                transactionDate: this.editDate,
                amount: Number(this.editAmount),
                transactionType: this.editType,
                category: this.editCategory
            });

            this.closeEditModal();

            await this.refreshTransactionList();
            this.publishTransactionRefresh();

            this.showToast(
                'Success',
                'Transaction updated successfully.',
                'success'
            );
        } catch (error) {
            this.showToast(
                'Unable to Update',
                this.getErrorMessage(error),
                'error'
            );
        } finally {
            this.isSaving = false;
        }
    }

    async handleDelete(record) {
        const confirmed = await LightningConfirm.open({
            label: 'Delete Transaction',
            message:
                `Are you sure you want to delete "${record.Name}"? ` +
                'This action cannot be undone.',
            theme: 'warning'
        });

        if (!confirmed) {
            return;
        }

        this.isLoading = true;

        try {
            await deleteTransaction({
                transactionId: record.Id
            });

            await this.refreshTransactionList();
            this.publishTransactionRefresh();

            this.showToast(
                'Success',
                'Transaction deleted successfully.',
                'success'
            );
        } catch (error) {
            this.showToast(
                'Unable to Delete',
                this.getErrorMessage(error),
                'error'
            );
        } finally {
            this.isLoading = false;
        }
    }

    async refreshTransactionList() {
        if (this.wiredTransactionsResult) {
            await refreshApex(this.wiredTransactionsResult);
        }
    }

    publishTransactionRefresh() {
        publish(this.messageContext, FINSIGHT_FILTER, {
            refreshTransactions: Date.now()
        });
    }

    getErrorMessage(error) {
        return (
            error?.body?.message ||
            error?.message ||
            'An unexpected error occurred.'
        );
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}
