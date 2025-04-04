// Define the pricing configuration object
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

// Function to update all pricing on the page
function updatePricing() {
    // For debugging - remove in production
    console.log("Updating pricing with config:", pricingConfig);
    
    // Update plan cards
    document.querySelectorAll('.plan-card').forEach(card => {
        const planHeader = card.querySelector('.plan-header h3');
        if (!planHeader) return;
        
        const planTitle = planHeader.textContent.trim();
        let planKey;
        
        switch(planTitle) {
            case "One Month Plan":
                planKey = "oneMonth";
                break;
            case "Quarterly Plan":
                planKey = "quarterly";
                break;
            case "Half-Yearly Plan":
                planKey = "halfYearly";
                break;
            default:
                console.warn("Unknown plan title:", planTitle);
                return;  // Skip if no matching plan
        }
        
        console.log(`Processing plan: ${planTitle}, planKey: ${planKey}`);
        
        // Check if the plan exists in our config
        if (!pricingConfig[planKey]) {
            console.error(`Plan key ${planKey} not found in pricingConfig`);
            return;
        }
        
        // Update price display
        const priceElement = card.querySelector('.plan-price');
        if (priceElement) {
            priceElement.textContent = `₹${pricingConfig[planKey].price.toLocaleString()}`;
        }
        
        // Update CTA buttons with plan data
        const ctaButton = card.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.setAttribute('data-plan', planKey);
            ctaButton.setAttribute('data-price', pricingConfig[planKey].price);
            ctaButton.setAttribute('data-name', pricingConfig[planKey].name);
            ctaButton.setAttribute('data-duration', pricingConfig[planKey].duration);
            
            // Remove any existing click event listeners
            const newCtaButton = ctaButton.cloneNode(true);
            ctaButton.parentNode.replaceChild(newCtaButton, ctaButton);
            
            // Add event listener for the payment page redirect
            newCtaButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get data directly from pricingConfig to ensure consistency
                const planData = {
                    plan: this.getAttribute('data-plan'),
                    price: pricingConfig[this.getAttribute('data-plan')].price,
                    name: pricingConfig[this.getAttribute('data-plan')].name,
                    duration: pricingConfig[this.getAttribute('data-plan')].duration
                };
                
                console.log("Plan selected:", planData);
                
                // Store plan data in localStorage for payment page
                localStorage.setItem('selectedPlan', JSON.stringify(planData));
                
                // Redirect to payment page
                window.location.href = 'payment.html';
            });
        }
    });
    
    // Update any elements with price-mention class
    document.querySelectorAll('.price-mention').forEach(element => {
        const planKey = element.getAttribute('data-plan');
        if (planKey && pricingConfig[planKey]) {
            element.textContent = `₹${pricingConfig[planKey].price.toLocaleString()}`;
        }
    });
    
    // Update ALL elements that mention the ₹499 price
    document.querySelectorAll('*').forEach(element => {
        if (element.childNodes && element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            // Only check text nodes to avoid modifying prices inside attributes
            const text = element.textContent;
            if (text && text.includes('₹499')) {
                element.textContent = text.replace('₹499', `₹${pricingConfig.oneMonth.price}`);
            }
        }
    });
    
    // Update the fixed CTA buttons - adding proper event listeners for general join buttons
    const joinButtons = document.querySelectorAll('a[href="#join"], .join-button, .whatsapp-float, .cta-button:not([data-plan])');
    joinButtons.forEach(button => {
        // Remove any existing click event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add the event listener to the new button
        newButton.addEventListener('click', function(e) {
            if (this.href && this.href.includes('#join')) {
                e.preventDefault();
            }
            
            // Default to quarterly plan for these general buttons
            const planData = {
                plan: "quarterly",
                price: pricingConfig.quarterly.price,
                name: pricingConfig.quarterly.name,
                duration: pricingConfig.quarterly.duration
            };
            
            console.log("General button plan selected:", planData);
            
            // Store plan data for payment page
            localStorage.setItem('selectedPlan', JSON.stringify(planData));
            
            // If it doesn't have a specific href or it's #join, redirect to payment
            if (!this.href || this.href.includes('#join')) {
                window.location.href = 'payment.html';
            }
        });
    });
    
    // Update the main CTA in hero section
    const mainCTA = document.querySelector('.hero-section .cta-button');
    if (mainCTA) {
        // Remove any existing click event listeners
        const newMainCTA = mainCTA.cloneNode(true);
        mainCTA.parentNode.replaceChild(newMainCTA, mainCTA);
        
        // Add event listener
        newMainCTA.addEventListener('click', function(e) {
            e.preventDefault();
            const planData = {
                plan: "quarterly",
                price: pricingConfig.quarterly.price,
                name: pricingConfig.quarterly.name,
                duration: pricingConfig.quarterly.duration
            };
            
            console.log("Hero CTA selected:", planData);
            
            localStorage.setItem('selectedPlan', JSON.stringify(planData));
            window.location.href = 'payment.html';
        });
    }
    
    // Update direct links to payment.html (ONLY those WITHOUT data-plan)
    document.querySelectorAll('a[href="payment.html"]:not([data-plan])').forEach(link => {
        // Remove any existing click event listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Add event listener
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            const planData = {
                plan: "quarterly",
                price: pricingConfig.quarterly.price,
                name: pricingConfig.quarterly.name,
                duration: pricingConfig.quarterly.duration
            };
            
            console.log("Direct link selected:", planData);
            
            localStorage.setItem('selectedPlan', JSON.stringify(planData));
            window.location.href = 'payment.html';
        });
    });
}

// Function to fetch pricing from an API (can be implemented in the future)
async function fetchPricing() {
    try {
        // This is where you would make an API call to get dynamic pricing
        // For now, we'll use the static pricing defined above
        
        // Example API call (commented out)
        // const response = await fetch('https://api.therealowner.in/pricing');
        // const data = await response.json();
        // Object.keys(data).forEach(key => {
        //    pricingConfig[key] = data[key];
        // });
        
        // After fetching, update the UI
        updatePricing();
    } catch (error) {
        console.error('Error fetching pricing:', error);
        // Fall back to default pricing
        updatePricing();
    }
}

// Check if localStorage has a selected plan and redirect to payment if on payment page
function checkSelectedPlan() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('payment.html')) {
        const selectedPlan = localStorage.getItem('selectedPlan');
        if (!selectedPlan) {
            // If no plan is selected, default to quarterly plan
            const planData = {
                plan: "quarterly",
                price: pricingConfig.quarterly.price,
                name: pricingConfig.quarterly.name,
                duration: pricingConfig.quarterly.duration
            };
            localStorage.setItem('selectedPlan', JSON.stringify(planData));
        }
        
        try {
            // Update payment page with selected plan details
            const planDetails = JSON.parse(localStorage.getItem('selectedPlan'));
            console.log("Loading plan details on payment page:", planDetails);
        
            if (planDetails) {
                // Get plan data directly from pricingConfig using the plan key
                // This ensures we always use the correct price
                const planKey = planDetails.plan;
                if (!pricingConfig[planKey]) {
                    console.error("Invalid plan key:", planKey);
                    return;
                }
                
                const planPrice = pricingConfig[planKey].price;
                
                const planNameElement = document.getElementById('selected-plan-name');
                const planPriceElement = document.getElementById('selected-plan-price');
                const planDurationElement = document.getElementById('selected-plan-duration');
                
                if (planNameElement) planNameElement.textContent = pricingConfig[planKey].name;
                if (planPriceElement) planPriceElement.textContent = `₹${planPrice.toLocaleString()}`;
                if (planDurationElement) planDurationElement.textContent = pricingConfig[planKey].duration;
                
                // Update any form inputs with plan values
                const planInput = document.querySelector('input[name="plan"]');
                const priceInput = document.querySelector('input[name="price"]');
                const nameInput = document.querySelector('input[name="plan_name"]');
                const durationInput = document.querySelector('input[name="duration"]');
                
                if (planInput) planInput.value = planKey;
                if (priceInput) priceInput.value = planPrice;
                if (nameInput) nameInput.value = pricingConfig[planKey].name;
                if (durationInput) durationInput.value = pricingConfig[planKey].duration;
            }
        } catch (error) {
            console.error("Error processing plan details:", error);
        }
    }
}

// Function to initialize everything when the page loads
function initializePage() {
    console.log("Initializing page with pricingConfig:", pricingConfig);
    
    // First fetch and update pricing
    fetchPricing();
    
    // Then check if we're on the payment page and handle accordingly
    checkSelectedPlan();
    
    // Add scroll animations if you have any
    const scrollElements = document.querySelectorAll('.scroll-animate');
    if (scrollElements.length > 0) {
        window.addEventListener('scroll', function() {
            scrollElements.forEach(element => {
                const position = element.getBoundingClientRect();
                // If element is in viewport
                if (position.top < window.innerHeight && position.bottom >= 0) {
                    element.classList.add('active');
                }
            });
        });
    }
    
    // Add FAQ accordion functionality if present
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                item.classList.toggle('active');
            });
        }
    });
    
    // Mobile menu toggle if present
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Add debugging code to verify plan selection
    document.querySelectorAll('.plan-card .cta-button').forEach(button => {
        button.addEventListener('click', function() {
            console.log("Plan button clicked:", this.getAttribute('data-plan'));
            setTimeout(() => {
                console.log("Plan in localStorage:", JSON.parse(localStorage.getItem('selectedPlan')));
            }, 100);
        });
    });
}

// Call this function when the document is loaded
document.addEventListener("DOMContentLoaded", initializePage);