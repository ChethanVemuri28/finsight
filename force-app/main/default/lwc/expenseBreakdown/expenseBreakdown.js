
import { LightningElement, api, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { refreshApex } from '@salesforce/apex';
import CHARTJS from '@salesforce/resourceUrl/chartjs';

import {
    MessageContext,
    subscribe,
    unsubscribe,
    APPLICATION_SCOPE
} from 'lightning/messageService';

import FINSIGHT_FILTER from
    '@salesforce/messageChannel/FinSightFilter__c';

import getMonthlyExpensesByCategory from
    '@salesforce/apex/FinSightDashboardController.getMonthlyExpensesByCategory';

export default class ExpenseBreakdown extends LightningElement {
    _selectedMonth = String(new Date().getMonth() + 1);
    _selectedYear = String(new Date().getFullYear());

    expenses = [];
    errorMessage;
    chart;
    chartJsInitialized = false;
    chartLoadPromise;
    wiredExpensesResult;
    subscription;

    @wire(MessageContext)
    messageContext;

    @api
    get selectedMonth() {
        return this._selectedMonth;
    }

    set selectedMonth(value) {
        if (value !== undefined && value !== null && value !== '') {
            this._selectedMonth = String(value);
        }
    }

    @api
    get selectedYear() {
        return this._selectedYear;
    }

    set selectedYear(value) {
        if (value !== undefined && value !== null && value !== '') {
            this._selectedYear = String(value);
        }
    }

    @wire(getMonthlyExpensesByCategory, {
        selectedMonth: '$selectedMonthNumber',
        selectedYear: '$selectedYearNumber'
    })
    wiredExpenses(result) {
        this.wiredExpensesResult = result;

        const { data, error } = result;

        if (data) {
            this.expenses = data.filter(
                item => Number(item.totalAmount) > 0
            );

            this.errorMessage = undefined;

            if (this.chartJsInitialized) {
                this.updateChart();
            }
        } else if (error) {
            this.expenses = [];
            this.errorMessage =
                error.body?.message ||
                'Unable to load expense breakdown.';

            this.destroyChart();
        }
    }

    get selectedMonthNumber() {
        return Number(this._selectedMonth);
    }

    get selectedYearNumber() {
        return Number(this._selectedYear);
    }

    get hasExpenses() {
        return this.expenses.length > 0;
    }

    renderedCallback() {
        // Keep updating the chart when LWC rerenders the canvas.
        if (this.chartJsInitialized) {
            this.updateChart();
            return;
        }

        // Avoid loading Chart.js more than once.
        if (this.chartLoadPromise) {
            return;
        }

        this.chartLoadPromise = loadScript(
            this,
            CHARTJS + '/chart.umd.min.js'
        )
            .then(() => {
                this.chartJsInitialized = true;
                this.updateChart();
            })
            .catch(() => {
                this.chartLoadPromise = undefined;
                this.errorMessage =
                    'Unable to load Chart.js. Check the chartjs static resource ZIP.';
            });
    }

    updateChart() {
        if (
            !this.isConnected ||
            !this.chartJsInitialized ||
            !window.Chart ||
            !this.template.querySelector('canvas')
        ) {
            return;
        }

        if (!this.expenses.length) {
            this.destroyChart();
            return;
        }

        const canvas = this.template.querySelector('canvas');

        const labels = this.expenses.map(
            item => item.category || 'Uncategorized'
        );

        const values = this.expenses.map(
            item => Number(item.totalAmount) || 0
        );

        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = values;
            this.chart.update();
            return;
        }

        this.chart = new window.Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#0D9488',
                        '#3B82F6',
                        '#F59E0B',
                        '#8B5CF6',
                        '#EF4444',
                        '#14B8A6',
                        '#6366F1',
                        '#EC4899',
                        '#84CC16',
                        '#64748B'
                    ],
                    borderColor: '#FFFFFF',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const amount = new Intl.NumberFormat(
                                    'en-IN',
                                    {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 2
                                    }
                                ).format(context.raw || 0);

                                return `${context.label}: ${amount}`;
                            }
                        }
                    }
                }
            }
        });
    }

    destroyChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = undefined;
        }
    }

    connectedCallback() {
        this.subscribeToFilters();
    }

    subscribeToFilters() {
        if (this.subscription || !this.messageContext) {
            return;
        }

        this.subscription = subscribe(
            this.messageContext,
            FINSIGHT_FILTER,
            message => {
                if (
                    message.selectedMonth !== undefined &&
                    message.selectedMonth !== null &&
                    message.selectedMonth !== ''
                ) {
                    const month = String(message.selectedMonth);

                    if (month !== this._selectedMonth) {
                        this._selectedMonth = month;
                    }
                }

                if (
                    message.selectedYear !== undefined &&
                    message.selectedYear !== null &&
                    message.selectedYear !== ''
                ) {
                    const year = String(message.selectedYear);

                    if (year !== this._selectedYear) {
                        this._selectedYear = year;
                    }
                }

                if (message.refreshTransactions) {
                    this.refreshExpenseData();
                }
            },
            { scope: APPLICATION_SCOPE }
        );
    }

    async refreshExpenseData() {
        if (!this.wiredExpensesResult) {
            return;
        }

        try {
            await refreshApex(this.wiredExpensesResult);
        } catch (error) {
            this.errorMessage =
                error.body?.message ||
                error.message ||
                'Unable to refresh expense breakdown.';
        }
    }

    disconnectedCallback() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = undefined;
        }

        this.destroyChart();
    }
}
