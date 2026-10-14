
import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import {
    MessageContext,
    publish
} from 'lightning/messageService';

import FINSIGHT_FILTER from
    '@salesforce/messageChannel/FinSightFilter__c';

import createTransaction from
    '@salesforce/apex/TransactionController.createTransaction';

export default class TransactionManager extends LightningElement {
    name = '';
    transactionDate = new Date().toISOString().slice(0, 10);
    amount = '';
    transactionType = 'Expense';
    category = 'Other';
    description = '';
    financialAccountId;

    isSaving = false;

    @wire(MessageContext)
    messageContext;

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

    handleInputChange(event) {
        const field = event.target.dataset.field;

        if (field) {
            this[field] = event.target.value;
        }
    }

    handleAccountChange(event) {
        this.financialAccountId = event.detail.recordId;
    }

    validateForm() {
        const form = this.template.querySelector('.add-form');

        if (!form) {
            return false;
        }

        const inputs = [
            ...form.querySelectorAll(
                'lightning-input, lightning-combobox'
            )
        ];

        const valid = inputs.reduce(
            (allValid, input) => input.reportValidity() && allValid,
            true
        );

        if (!valid) {
            return false;
        }

        const amountInput = inputs.find(
            input => input.dataset.field === 'amount'
        );

        if (
            amountInput &&
            (
                !Number.isFinite(Number(amountInput.value)) ||
                Number(amountInput.value) <= 0
            )
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

    async handleSave() {
        if (!this.validateForm()) {
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

            this.publishTransactionRefresh();

            this.showToast(
                'Success',
                'Transaction saved successfully.',
                'success'
            );

            this.resetForm();

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

    publishTransactionRefresh() {
        if (!this.messageContext) {
            return;
        }

        publish(this.messageContext, FINSIGHT_FILTER, {
            refreshTransactions: Date.now()
        });
    }

    resetForm() {
        this.name = '';
        this.transactionDate = new Date().toISOString().slice(0, 10);
        this.amount = '';
        this.transactionType = 'Expense';
        this.category = 'Other';
        this.description = '';
        this.financialAccountId = undefined;
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
