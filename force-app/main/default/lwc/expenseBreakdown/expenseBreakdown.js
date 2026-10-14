
import { LightningElement, api, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import CHARTJS from '@salesforce/resourceUrl/chartjs';

import { MessageContext, subscribe, APPLICATION_SCOPE } from 'lightning/messageService';
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
    @wire(MessageContext)
    messageContext;
    subscription;

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
    wiredExpenses({ data, error }) {
        if (data) {
            this.expenses = data.filter(
                item => Number(item.totalAmount) > 0
            );

            this.errorMessage = undefined;

            if (this.expenses.length === 0) {
                this.destroyChart();
            } else {
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
        if (this.chartJsInitialized) {
            this.updateChart();
            return;
        }

        this.chartJsInitialized = true;

        loadScript(this, CHARTJS + '/chart.umd.min.js')
            .then(() => {
                this.updateChart();
            })
            .catch(() => {
                this.errorMessage =
                    'Unable to load Chart.js. Check the chartjs static resource ZIP.';
            });
    }

    updateChart() {
        if (
            !this.isConnected ||
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

    disconnectedCallback() {
        this.destroyChart();
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
            (message) => {
                this._selectedMonth = String(message.selectedMonth);
                this._selectedYear = String(message.selectedYear);
            },
            { scope: APPLICATION_SCOPE }
        );
    }
}
