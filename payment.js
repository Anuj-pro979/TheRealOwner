// Firebase Configuration
const firebaseConfig = {
    // Replace with your Firebase project configuration
    apiKey: "AIzaSyCadZIoYzIc_QhEkGjv86G4rjFwMASd5ig",
    authDomain: "nothing-d3af4.firebaseapp.com",
    databaseURL: "https://nothing-d3af4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "nothing-d3af4",
    storageBucket: "nothing-d3af4.firebasestorage.app",
    messagingSenderId: "7155955115",
    appId: "1:7155955115:web:3bd80618f9aff1a4dc8eee",
    measurementId: "G-XSVGL2M8LL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Define the pricing configuration object (fallback in case localStorage fails)
const pricingConfig = {
    oneMonth: {
        price: 499,
        name: "One-Month Plan",
        duration: "1 month"
    },
    quarterly: {
        price: 999,
        name: "Quarterly Plan",
        duration: "3 months"
    },
    halfYearly: {
        price: 1799,
        name: "Half-Yearly Plan",
        duration: "6 months"
    }
};

// Form navigation and logic
document.addEventListener('DOMContentLoaded', function() {
    // First, append the WhatsApp group modal to the body
    appendWhatsAppModal();

    // Elements
    const userDetailsForm = document.getElementById('userDetailsForm');
    const orderSummaryForm = document.getElementById('orderSummaryForm');
    
    const nextToOrderSummaryBtn = document.getElementById('nextToOrderSummaryBtn');
    const backToUserDetailsBtn = document.getElementById('backToUserDetailsBtn');
    const payButton = document.getElementById('payButton');
    
    const progressBar = document.getElementById('progress-bar');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    
    // User data object
    let userData = {
        fullName: "",
        contactNumber: "",
        whatsappNumber: "",
        email: "",
        state: "",
        userType: "",
        plan: "oneMonth", // Default fallback
        planName: pricingConfig.oneMonth.name,
        planDuration: pricingConfig.oneMonth.duration,
        planPrice: pricingConfig.oneMonth.price
    };
    
    // Add debugging to help identify issues
    console.log("Initial userData:", userData);
    
    // Load selected plan from localStorage (provided by previous page)
    function loadSelectedPlan() {
        try {
            const storedPlan = localStorage.getItem('selectedPlan');
            console.log("Raw localStorage data:", storedPlan);
            
            if (storedPlan) {
                const planData = JSON.parse(storedPlan);
                console.log("Parsed plan data:", planData);
                
                // First validate that we have a valid plan key
                if (!planData.plan || !pricingConfig[planData.plan]) {
                    console.error("Invalid plan key received:", planData.plan);
                    alert("Error loading plan data. Using default plan.");
                    return;
                }
                
                // Use the plan key to get correct price from pricingConfig
                // This ensures we always use the correct price even if the localStorage data is corrupted
                const planKey = planData.plan;
                
                // Update user data with selected plan
                userData.plan = planKey;
                userData.planName = pricingConfig[planKey].name;
                userData.planDuration = pricingConfig[planKey].duration;
                userData.planPrice = pricingConfig[planKey].price;
                
                console.log("Updated userData after plan load:", userData);
                
                // Update UI with selected plan
                document.getElementById('selectedPlanName').textContent = userData.planName;
                document.getElementById('selectedPlanDuration').textContent = userData.planDuration;
                document.getElementById('selectedPlanPrice').textContent = `₹${userData.planPrice}`;
            } else {
                console.log("No plan found in localStorage, using default");
            }
        } catch (error) {
            console.error("Error loading selected plan:", error);
            alert("There was an error loading your selected plan. Using default plan.");
        }
    }
    
    // Load the plan on page load
    loadSelectedPlan();
    
    // Step 1 to Step 2
    nextToOrderSummaryBtn.addEventListener('click', function() {
        // Validate user details form
        const fullName = document.getElementById('fullName').value;
        const contactNumber = document.getElementById('contactNumber').value;
        const whatsappNumber = document.getElementById('whatsappNumber').value;
        const email = document.getElementById('email').value;
        const state = document.getElementById('state').value;
        const userType = document.querySelector('input[name="userType"]:checked')?.value;
        
        if (!fullName || !contactNumber || !whatsappNumber || !email || !state || !userType) {
            alert("Please fill in all required fields.");
            return;
        }
        
        // Save user details
        userData.fullName = fullName;
        userData.contactNumber = contactNumber;
        userData.whatsappNumber = whatsappNumber;
        userData.email = email;
        userData.state = state;
        userData.userType = userType;
        
        // Update summary
        document.getElementById('summaryPlanName').textContent = userData.planName;
        document.getElementById('summaryPlanDuration').textContent = userData.planDuration;
        document.getElementById('summaryPlanPrice').textContent = `₹${userData.planPrice}`;
        document.getElementById('summaryTotalPrice').textContent = `₹${userData.planPrice}`;
        
        document.getElementById('summaryFullName').textContent = userData.fullName;
        document.getElementById('summaryEmail').textContent = userData.email;
        document.getElementById('summaryContactNumber').textContent = userData.contactNumber;
        document.getElementById('summaryWhatsAppNumber').textContent = userData.whatsappNumber;
        
        // Move to next step
        userDetailsForm.classList.add('d-none');
        orderSummaryForm.classList.remove('d-none');
        
        // Update progress
        progressBar.style.width = "100%";
        step1.classList.remove('bg-success');
        step1.classList.add('bg-secondary');
        step2.classList.remove('bg-secondary');
        step2.classList.add('bg-success');
    });
    
    // Step 2 back to Step 1
    backToUserDetailsBtn.addEventListener('click', function() {
        orderSummaryForm.classList.add('d-none');
        userDetailsForm.classList.remove('d-none');
        
        // Update progress
        progressBar.style.width = "0%";
        step1.classList.add('bg-success');
        step1.classList.remove('bg-secondary');
        step2.classList.add('bg-secondary');
        step2.classList.remove('bg-success');
    });
    
    // Function to save all user data to Firebase after successful payment
    function saveAllDataToFirebase(paymentId) {
        return new Promise((resolve, reject) => {
            // First create the user document
            db.collection("users").add({
                fullName: userData.fullName,
                contactNumber: userData.contactNumber,
                whatsappNumber: userData.whatsappNumber,
                email: userData.email,
                state: userData.state,
                userType: userData.userType,
                plan: userData.plan,
                planName: userData.planName,
                planDuration: userData.planDuration,
                planPrice: userData.planPrice,
                paymentId: paymentId,
                paymentStatus: "completed",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then((userDocRef) => {
                console.log("User document written with ID: ", userDocRef.id);
                
                // Then create the payment document with reference to user
                return db.collection("payments").add({
                    paymentId: paymentId,
                    userId: userDocRef.id,
                    amount: userData.planPrice,
                    planName: userData.planName,
                    planDuration: userData.planDuration,
                    status: "completed",
                    userDetails: {
                        fullName: userData.fullName,
                        email: userData.email,
                        contactNumber: userData.contactNumber,
                        whatsappNumber: userData.whatsappNumber
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    // Return the user document ID for later use
                    return userDocRef.id;
                });
            })
            .then((userId) => {
                console.log("All documents written successfully");
                // Clear the localStorage after successful payment
                localStorage.removeItem('selectedPlan');
                resolve(userId);
            })
            .catch((error) => {
                console.error("Error adding documents: ", error);
                reject(error);
            });
        });
    }
    
    // Initialize Razorpay when Pay button is clicked
    payButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        console.log("Processing payment with data:", userData);
        
        // Initialize Razorpay options without saving to Firebase yet
        var options = {
            "key": "rzp_test_OF1OfAnK0znrXC", // Replace with your Razorpay Key ID
            "amount": userData.planPrice * 100, // Amount in paise
            "currency": "INR",
            "name": "Real Owner Community",
            "description": userData.planName + " - " + userData.planDuration,
            "image": "https://your-logo-url.png",
            "handler": function(response) {
                // Handle the payment success response
                if (response.razorpay_payment_id) {
                    // Only save data if payment is successful
                    saveAllDataToFirebase(response.razorpay_payment_id)
                        .then((userId) => {
                            // Show WhatsApp group modal instead of alert
                            showWhatsAppGroupModal(userId, response.razorpay_payment_id, userData.state, userData.plan);
                        })
                        .catch((error) => {
                            console.error("Error saving data: ", error);
                            alert("Payment was successful, but there was an error saving your information. Please contact support with your payment ID: " + response.razorpay_payment_id);
                        });
                }
            },
            "prefill": {
                "name": userData.fullName,
                "email": userData.email,
                "contact": userData.contactNumber
            },
            "notes": {
                "address": userData.state,
                "planType": userData.plan,
                "userType": userData.userType
            },
            "theme": {
                "color": "#e94057"
            }
        };
        
        // Initialize Razorpay
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
            alert("Payment failed. Please try again.");
            console.log(response.error);
        });
        rzp.open();
    });

    // Function to dynamically append the WhatsApp modal to the body
    function appendWhatsAppModal() {
        const modalHTML = `
        <div class="modal fade" id="whatsappGroupModal" tabindex="-1" aria-labelledby="whatsappGroupModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header" style="background-color: #25D366; color: white;">
                <h5 class="modal-title" id="whatsappGroupModalLabel">Join Your WhatsApp Group</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="text-center mb-4">
                  <i class="fab fa-whatsapp fa-4x" style="color: #25D366;"></i>
                  <h3 class="mt-3 mb-0">Payment Successful!</h3>
                  <p class="text-muted">Your membership is now active</p>
                </div>
                <div class="card border mb-3">
                  <div class="card-body text-center">
                    <h5 class="card-title" id="whatsappGroupName">Loading...</h5>
                    <p class="card-text mb-4">Click the button below to join your exclusive WhatsApp group based on your location and plan.</p>
                    <p class="card-text small text-muted mb-3">Note: This link will only work once and is unique to you.</p>
                    <a href="#" id="whatsappGroupLink" class="btn btn-lg w-100" style="background-color: #25D366; color: white;" target="_blank">
                      <i class="fab fa-whatsapp me-2"></i>Join WhatsApp Group
                    </a>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <p class="small text-muted w-100 text-center mb-0">Your membership details have been sent to your email as well.</p>
              </div>
            </div>
          </div>
        </div>
        `;
        
        // Append the modal HTML to the body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Function to get WhatsApp group link based on state and plan
    function getWhatsAppGroupLink(state, plan) {
        // Map of state and plan to WhatsApp group links
        const groupLinks = {
            // Telangana regions
            'Medak-oneMonth': 'https://chat.whatsapp.com/LC5SN5O0Tkk79zc3VaOPym',
            'Medak-quarterly': 'https://chat.whatsapp.com/invite/Medak3M',
            'Medak-halfYearly': 'https://chat.whatsapp.com/invite/Medak6M',
            
            'Warangal-oneMonth': 'https://chat.whatsapp.com/IYpc3NLJkyFBOFnBIVJcTw',
            'Warangal-quarterly': 'https://chat.whatsapp.com/invite/Warangal3M',
            'Warangal-halfYearly': 'https://chat.whatsapp.com/invite/Warangal6M',
            
            'Karimnagar-oneMonth': 'https://chat.whatsapp.com/CTMVtjhiCojJqvyHNuaqtE',
            'Karimnagar-quarterly': 'https://chat.whatsapp.com/invite/Karimnagar3M',
            'Karimnagar-halfYearly': 'https://chat.whatsapp.com/invite/Karimnagar6M',
            
            'Hyderabad-oneMonth': 'https://chat.whatsapp.com/HCMC9kVra8vC2Pe8kUqvkF',
            'Hyderabad-quarterly': 'https://chat.whatsapp.com/invite/Hyderabad3M',
            'Hyderabad-halfYearly': 'https://chat.whatsapp.com/invite/Hyderabad6M',
            
            'Nalgonda-oneMonth': 'https://chat.whatsapp.com/CSypbja8NfMEKdGyknzUov',
            'Nalgonda-quarterly': 'https://chat.whatsapp.com/invite/Nalgonda3M',
            'Nalgonda-halfYearly': 'https://chat.whatsapp.com/invite/Nalgonda6M',
            
            'Khammam-oneMonth': 'https://chat.whatsapp.com/JdhjQtITatSKk1zPLOfOnd',
            'Khammam-quarterly': 'https://chat.whatsapp.com/invite/Khammam3M',
            'Khammam-halfYearly': 'https://chat.whatsapp.com/invite/Khammam6M',
            
            'Adilabad-oneMonth': 'https://chat.whatsapp.com/K8nxVcKtl7mFWDJUjSwa5j',
            'Adilabad-quarterly': 'https://chat.whatsapp.com/invite/Adilabad3M',
            'Adilabad-halfYearly': 'https://chat.whatsapp.com/invite/Adilabad6M',
            
            'Mahabubnagar-oneMonth': 'https://chat.whatsapp.com/Kv2131xyBZ89Z5EdA4HpBF',
            'Mahabubnagar-quarterly': 'https://chat.whatsapp.com/invite/Mahabubnagar3M',
            'Mahabubnagar-halfYearly': 'https://chat.whatsapp.com/invite/Mahabubnagar6M',
            
            'Nizamabad-oneMonth': 'https://chat.whatsapp.com/CU96uhp1pVFJqcKUfKGmMX',
            'Nizamabad-quarterly': 'https://chat.whatsapp.com/invite/Nizamabad3M',
            'Nizamabad-halfYearly': 'https://chat.whatsapp.com/invite/Nizamabad6M',
            
            'Rangareddy-oneMonth': 'https://chat.whatsapp.com/Jh5wJcSztMJ9uj63Za29Im',
            'Rangareddy-quarterly': 'https://chat.whatsapp.com/invite/Rangareddy3M',
            'Rangareddy-halfYearly': 'https://chat.whatsapp.com/invite/Rangareddy6M',
            
            // Default fallback group
            'default-default': 'https://chat.whatsapp.com/invite/RealOwnerCommunity'
        };
        
        // Try to get the specific state-plan link, fall back to default if not found
        const key = `${state}-${plan}`;
        if (groupLinks[key]) {
            return {
                link: groupLinks[key],
                name: `${state} ${pricingConfig[plan].name} Group`
            };
        }
        
        // Return default group if specific one not found
        return {
            link: groupLinks['default-default'],
            name: 'Real Owner Community Group'
        };
    }

    // Function to create a unique, one-time use WhatsApp link
    function createUniqueWhatsAppLink(baseLink, userId, paymentId) {
        // In a production environment, you would:
        // 1. Call your backend API to generate a one-time use link
        // 2. Store the link status in your database to track if it's been used
        
        // For this implementation, we'll append a unique token to the link
        const uniqueToken = btoa(`${userId}-${paymentId}-${Date.now()}`);
        
        // Store the link creation in Firebase to track usage
        db.collection("whatsappLinks").add({
            userId: userId,
            paymentId: paymentId,
            baseLink: baseLink,
            token: uniqueToken,
            isUsed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then((docRef) => {
            console.log("WhatsApp link document created with ID: ", docRef.id);
        }).catch((error) => {
            console.error("Error creating WhatsApp link document: ", error);
        });
        
        // This should point to your backend endpoint that validates the token
        // and then redirects to the actual WhatsApp group
        return `${baseLink}?token=${uniqueToken}`;
    }

    // Function to show WhatsApp group modal after successful payment
    function showWhatsAppGroupModal(userId, paymentId, state, plan) {
        // Get the appropriate WhatsApp group info based on state and plan
        const groupInfo = getWhatsAppGroupLink(state, plan);
        
        // Create a unique one-time use link
        const uniqueLink = createUniqueWhatsAppLink(groupInfo.link, userId, paymentId);
        
        // Update the modal content
        document.getElementById('whatsappGroupName').textContent = groupInfo.name;
        
        // Set the link
        const linkElement = document.getElementById('whatsappGroupLink');
        linkElement.href = uniqueLink;
        
        // Track link usage
        linkElement.addEventListener('click', function() {
            // Record that this link has been used in Firebase
            db.collection("whatsappLinks").where("userId", "==", userId)
                .where("paymentId", "==", paymentId)
                .get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        // Mark the link as used
                        doc.ref.update({
                            isUsed: true,
                            usedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => {
                            console.log("WhatsApp link marked as used");
                        }).catch((error) => {
                            console.error("Error updating WhatsApp link: ", error);
                        });
                    });
                })
                .catch((error) => {
                    console.error("Error finding WhatsApp link: ", error);
                });
        });
        
        // Show the modal
        const whatsappModal = new bootstrap.Modal(document.getElementById('whatsappGroupModal'));
        whatsappModal.show();
    }
});