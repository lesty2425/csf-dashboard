// Global user data
        let currentUser = {
            name: 'John Doe',
            email: 'john.doe@example.com',
            avatar: 'JD'
        };

        // Page navigation
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
        }

        // User profile dropdown
        document.getElementById('user-profile').addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('dropdown-menu');
            const profile = document.getElementById('user-profile');
            
            profile.classList.toggle('open');
            dropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            const dropdown = document.getElementById('dropdown-menu');
            const profile = document.getElementById('user-profile');
            
            if (dropdown.classList.contains('open')) {
                dropdown.classList.remove('open');
                profile.classList.remove('open');
            }
        });

        // Tab switching functionality
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                tab.classList.add('active');
                const targetTab = tab.getAttribute('data-tab');
                document.getElementById(targetTab).classList.add('active');
            });
        });

        // Login form handling
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Simple validation (in real app, this would be server-side)
            if (email && password) {
                showPage('dashboard-page');
                updateUserDisplay();
            }
        });

        // Register form handling
        document.getElementById('register-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            if (name && email && password) {
                // Update user data
                currentUser.name = name;
                currentUser.email = email;
                currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
                
                showPage('dashboard-page');
                updateUserDisplay();
            }
        });

        // Profile form handling
        document.getElementById('profile-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('profile-full-name').value;
            const email = document.getElementById('profile-email-input').value;
            
            // Update user data
            currentUser.name = name;
            currentUser.email = email;
            currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
            
            updateUserDisplay();
            alert('Profile updated successfully!');
        });

        // Update user display across all pages
        function updateUserDisplay() {
            // Dashboard user info
            document.getElementById('user-name').textContent = currentUser.name;
            document.getElementById('user-email').textContent = currentUser.email;
            document.getElementById('user-avatar').textContent = currentUser.avatar;
            
            // Profile page
            document.getElementById('profile-name').textContent = currentUser.name;
            document.getElementById('profile-email').textContent = currentUser.email;
            document.getElementById('profile-avatar').textContent = currentUser.avatar;
            document.getElementById('profile-full-name').value = currentUser.name;
            document.getElementById('profile-email-input').value = currentUser.email;
        }

        // Settings toggle switches
        function toggleSwitch(element) {
            element.classList.toggle('active');
        }

        // Sign out function
        function signOut() {
            if (confirm('Are you sure you want to sign out?')) {
                showPage('login-page');
                // Reset form fields
                document.getElementById('login-form').reset();
            }
        }

        // Delete account function
        function deleteAccount() {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                if (confirm('This will permanently delete all your files and notes. Are you absolutely sure?')) {
                    alert('Account deleted successfully.');
                    showPage('login-page');
                }
            }
        }

        // Usage statistics simulation
        function updateUsage(files, notes, storage) {
            const fileFill = document.getElementById('files-progress');
            const notesFill = document.getElementById('notes-progress');
            const storageFill = document.getElementById('storage-progress');

            fileFill.value = (files / 1000) * 100;
            notesFill.value = (notes / 500) * 100;
            storageFill.value = (storage / 50) * 100;

            document.getElementById('files-count').textContent = `${files} / 1,000`;
            document.getElementById('notes-count').textContent = `${notes} / 500`;
            document.getElementById('storage-count').textContent = `${storage} GB / 50 GB`;
        }

        // Button interactions
        document.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            });
        });

        // Initialize the app
        document.addEventListener('DOMContentLoaded', function() {
            updateUserDisplay();
        });