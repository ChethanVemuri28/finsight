
import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getTransactions from
    '@salesforce/apex/TransactionController.getTransactions';
import createTransaction from
    '@salesforce/apex/TransactionController.createTransaction';

const COLUMNS = [
    { label: 'Name', fieldName: 'Name' },
    { label: 'Date', fieldName: 'Transaction_Date__c', type: 'date' },
    {
        label: 'Amount',
        fieldName: 'Amount__c',
        type: 'currency',
        typeAttributes: { currencyCode: 'INR' }
    },
    { label: 'Type', fieldName: 'Transaction_Type__c' },
    { label: 'Category', fieldName: 'Category__c' },
    {
        label: 'Financial Account',
        fieldName: 'financialAccountName'
    }
];

export default class TransactionManager extends LightningElement {
    name = '';
    transactionDate = new Date().toISOString().slice(0, 10);
    amount = '';
    transactionType = 'Expense';
    category = 'Other';
    description = '';
    financialAccountId;

    isSaving = false;
    isLoading = true;

    columns = COLUMNS;
    transactions = [];
    wiredTransactionsResult;

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

    @wire(getTransactions)
    wiredTransactions(result) {
        this.wiredTransactionsResult = result;

        if (result.data) {
            this.transactions = result.data.map(record => ({
                ...record,
                financialAccountName:
                    record.Financial_Account__r?.Name || '—'
            }));
            this.isLoading = false;
        } else if (result.error) {
            this.isLoading = false;
            this.showToast(
                'Error',
                this.getErrorMessage(result.error),
                'error'
            );
        }
    }

    handleInputChange(event) {
        this[event.target.dataset.field] = event.target.value;
    }

    handleAccountChange(event) {
        this.financialAccountId = event.detail.recordId;
    }

    async handleSave() {
        const inputs = [
            ...this.template.querySelectorAll(
                'lightning-input, lightning-combobox'
            )
        ];

        const valid = inputs.reduce(
            (allValid, input) => input.reportValidity() && allValid,
            true
        );

        if (!valid) {
            return;
        }

        if (!Number.isFinite(Number(this.amount)) ||
            Number(this.amount) <= 0) {
            this.showToast(
                'Invalid Amount',
                'Enter an amount greater than zero.',
                'error'
            );
            return;
        }

        this.isSaving = true;

        try {
            await createTransaction({
                name: this.name.trim(),
                transactionDate: this.transactionDate,
                amount: Number(this.amount),
                transactionType: this.transactionType,
                category: this.category,
                description: this.description,
                financialAccountId: this.financialAccountId || null
            });

            this.showToast(
                'Success',
                'Transaction saved successfully.',
                'success'
            );

            this.name = '';
            this.amount = '';
            this.transactionType = 'Expense';
            this.category = 'Other';
            this.description = '';
            this.financialAccountId = undefined;

            await refreshApex(this.wiredTransactionsResult);
        } catch (error) {
            this.showToast(
                'Unable to Save',
                this.getErrorMessage(error),
                'error'
            );
        } finally {
            this.isSaving = false;
        }
    }

    getErrorMessage(error) {
        return error?.body?.message ||
            error?.message ||
            'An unexpected error occurred.';
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
