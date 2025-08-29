import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ChartOptions, ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit {
  username = '';
  currentView: 'dashboard' | 'apply' | 'myLeaves' | 'approvals' | 'balances' = 'dashboard';

  // -------------------- NEW LEAVE FORM --------------------
  newLeave = { 
    start_date: '', 
    end_date: '', 
    leave_type: undefined as 'sick' | 'medical' | 'privileged' | undefined,  // ✅ fixed
    reason: ''   // ✨ reason typed manually
  };

  // -------------------- DATA --------------------
  leaves: any[] = [];
  balance = { sick_casual: 0, medical: 0, privileged: 0 };
  currentYear: number = new Date().getFullYear();

  // -------------------- TOAST --------------------
  toastMessage: string = '';

  // -------------------- PIE CHART CONFIG --------------------
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Leave Balances' }
    }
  };
  pieChartLabels = ['Sick/Casual', 'Medical', 'Privileged'];
  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: this.pieChartLabels,
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#28a745', '#17a2b8', '#007bff']
    }]
  };
  pieChartType: 'pie' = 'pie';

  constructor(
    private leaveService: LeaveService, 
    private auth: AuthService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || 'Employee';
    this.loadLeaves();
  }

  // -------------------- LOAD LEAVES --------------------
  loadLeaves() {
    this.leaveService.myLeaves().subscribe({
      next: (res: any) => this.leaves = res,
      error: () => this.showToast('Failed to fetch leaves')
    });
  }

  // -------------------- LOAD BALANCE --------------------
  loadBalance() {
    this.leaveService.getLeaveBalance().subscribe({
      next: (res) => {
        this.balance = res;
        this.pieChartData = {
          labels: this.pieChartLabels,
          datasets: [{
            data: [res.sick_casual, res.medical, res.privileged],
            backgroundColor: ['#28a745', '#17a2b8', '#007bff']
          }]
        };
      },
      error: () => this.showToast('Failed to fetch leave balance')
    });
  }

  // -------------------- SWITCH VIEW --------------------
  setView(view: 'dashboard' | 'apply' | 'myLeaves' | 'approvals' | 'balances') {
    this.currentView = view;
    if (view === 'balances') this.loadBalance();
    if (view === 'myLeaves' || view === 'approvals') this.loadLeaves();
  }

  // -------------------- APPLY LEAVE --------------------
  applyLeave() {
    if (!this.newLeave.start_date || !this.newLeave.end_date || !this.newLeave.leave_type || !this.newLeave.reason) {
      this.showToast('All fields are required');
      return;
    }

    const leavePayload = { 
      start_date: this.newLeave.start_date,
      end_date: this.newLeave.end_date,
      leave_type: this.newLeave.leave_type,
      reason: this.newLeave.reason
    };

    this.leaveService.applyLeave(leavePayload).subscribe({
      next: () => {
        this.showToast('✅ Leave applied successfully');
        this.newLeave = { start_date: '', end_date: '', leave_type: undefined, reason: '' };
        this.loadLeaves();
        this.loadBalance();
        setTimeout(() => this.setView('myLeaves'), 2000);
      },
      error: (err) => {
        const msg = (err?.error?.error) || 'Failed to apply leave';
        this.showToast(msg);
      }
    });
  }

  // -------------------- DELETE LEAVE --------------------
  deleteLeave(id: number) {
    this.leaveService.deleteLeave(id).subscribe({
      next: () => {
        this.showToast(`🗑️ Leave #${id} cancelled`);
        this.loadLeaves();
        this.loadBalance();
      },
      error: () => this.showToast('Failed to delete leave')
    });
  }

  // -------------------- LOGOUT --------------------
  confirmLogout() {
    this.auth.logout();
  }

  // -------------------- TOAST --------------------
  showToast(message: string) {
    this.toastMessage = message;
    setTimeout(() => { this.toastMessage = ''; }, 3000);
  }
}
