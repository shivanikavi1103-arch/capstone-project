import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../services/leave.service';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.css']
})
export class ManagerDashboardComponent implements OnInit {

  pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Sick/Casual', 'Medical', 'Privileged'],
    datasets: [
      {
        data: [10, 10, 10], 
        backgroundColor: ['#28a745', '#17a2b8', '#007bff']
      }
    ]
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

  username = '';
  currentView: 'dashboard' | 'approvals' | 'all-leaves' | 'balances' | 'employees' | 'create-employee' = 'dashboard';

  leaves: any[] = [];
  allLeaves: any[] = [];
  pendingLeaves: any[] = [];
  employeeBalances: { username: string; sick_casual: number; medical: number; privileged: number }[] = [];
  pendingEmployees: { id: number; username: string }[] = [];

  loading = false;
  error = '';
  toastMessage = '';
  currentYear = new Date().getFullYear();

  newEmployee = { username: '', password: '' };

  constructor(private leaveService: LeaveService, private router: Router) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || 'Manager';
    this.loadAllLeaves();
    this.loadPendingEmployees();
    this.loadEmployeeBalances();
  }


  createEmployee(): void {
    if (!this.newEmployee.username || !this.newEmployee.password) {
      this.error = 'Username and password are required';
      return;
    }
    this.leaveService.createEmployee(this.newEmployee.username, this.newEmployee.password).subscribe({
      next: () => {
        this.showToast('Employee created successfully. Waiting for approval.');
        this.newEmployee = { username: '', password: '' };
        //this.setView('employees');      
        this.loadPendingEmployees();    
      },
      error: () => this.error = 'Failed to create employee'
    });
  }

 

  setView(view: 'dashboard' | 'approvals' | 'balances' | 'all-leaves' | 'employees' | 'create-employee') {
    this.currentView = view;
    this.error = '';
    this.toastMessage = '';
    switch (view) {
      case 'approvals':
        this.leaves = this.pendingLeaves;
        break;
      case 'all-leaves':
        this.leaves = this.allLeaves;
        break;
      case 'balances':
        this.loadEmployeeBalances();
        break;
      case 'employees':
        this.loadPendingEmployees();
        break;
    }
  }
  loadAllLeaves(): void {
    this.loading = true;
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any[]) => {
        this.allLeaves = res;
        this.leaves = res;
        this.pendingLeaves = res.filter(l => l.status === 'Pending');
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load leaves';
        this.loading = false;
      }
    });
  }

  approve(leave: any): void {
    this.updateLeaveStatus(leave.id, 'Approved', leave.remarks || 'Approved by manager');
  }

  
  reject(leave: any): void {
    this.updateLeaveStatus(leave.id, 'Rejected', leave.remarks || 'Rejected by manager');
  }
  updateLeaveStatus(leaveId: number, status: 'Approved' | 'Rejected', remarks: string): void {
    this.loading = true;
    this.leaveService.updateLeaveStatus(leaveId, status, remarks).subscribe({
      next: () => {
        setTimeout(() => {
          this.showToast(`Leave ${status.toLowerCase()} successfully`);
          this.loadAllLeaves();
          this.loading = false;
        }, 2000);
      },
      error: () => {
        this.error = 'Failed to update leave';
        this.loading = false;
      }
    });
  }



  loadEmployeeBalances(): void {
    this.loading = true;
    this.leaveService.getEmployeeBalances().subscribe({
      next: (res) => {
        this.employeeBalances = res;
        if (res.length > 0) {
          const first = res[0];
          this.pieChartData.datasets[0].data = [
            first.sick_casual || 10,
            first.medical || 10,
            first.privileged || 10
          ];
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load balances';
        this.loading = false;
      }
    });
  }


  loadPendingEmployees(): void {
    this.leaveService.getPendingEmployees().subscribe({
      next: (res) => this.pendingEmployees = res,
      error: () => this.error = 'Failed to load pending employees'
    });
  }

  approveEmployee(userId: number): void {
    this.leaveService.approveEmployee(userId).subscribe({
      next: () => {
        this.showToast('Employee approved successfully');
        this.loadPendingEmployees();
      },
      error: () => this.error = 'Failed to approve employee'
    });
  }



  showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => this.toastMessage = '', 3000);
  }

  logout(): void {
    localStorage.removeItem('username');
    this.showToast('Logged out successfully');
    setTimeout(() => this.router.navigate(['/login']), 1500);
  }



  quickActions: {
    title: string;
    view: 'dashboard' | 'approvals' | 'balances' | 'all-leaves' | 'employees' | 'create-employee';
    icon: string;
  }[] = [
    { title: 'Pending Approvals', view: 'approvals', icon: 'bi-clipboard-check' },
    { title: 'All Leaves', view: 'all-leaves', icon: 'bi-calendar-week' },
    { title: 'Leave Balances', view: 'balances', icon: 'bi-bar-chart-line' },
    { title: 'Create Employee', view: 'create-employee', icon: 'bi-person-plus' }
  ];
}
