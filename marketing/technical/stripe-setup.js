const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_live_YOUR_SECRET_KEY');

async function createReleasePilotProducts() {
  console.log('🚀 Setting up ReleasePilot products in Stripe...\n');

  try {
    // Create the main product
    console.log('Creating ReleasePilot product...');
    const product = await stripe.products.create({
      name: 'ReleasePilot',
      description: 'GitHub Action for automated PR summaries, semantic versioning, changelog updates, and release notes',
      metadata: {
        product_line: 'releasepilot',
        category: 'developer_tools'
      }
    });
    console.log('✅ Product created:', product.id);

    // Create Starter tier - Monthly
    console.log('\nCreating Starter tier pricing...');
    const starterMonthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 1900, // $19.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'ReleasePilot Starter - Monthly',
      metadata: {
        tier: 'starter',
        repo_limit: '5',
        billing: 'monthly'
      }
    });
    console.log('✅ Starter Monthly:', starterMonthly.id);

    // Create Starter tier - Annual (17% off)
    const starterAnnual = await stripe.prices.create({
      product: product.id,
      unit_amount: 19000, // $190.00 per year (saves $38)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'ReleasePilot Starter - Annual',
      metadata: {
        tier: 'starter',
        repo_limit: '5',
        billing: 'annual',
        savings: '17%'
      }
    });
    console.log('✅ Starter Annual:', starterAnnual.id);

    // Create Professional tier - Monthly
    console.log('\nCreating Professional tier pricing...');
    const professionalMonthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'ReleasePilot Professional - Monthly',
      metadata: {
        tier: 'professional',
        repo_limit: '20',
        billing: 'monthly',
        popular: 'true'
      }
    });
    console.log('✅ Professional Monthly:', professionalMonthly.id);

    // Create Professional tier - Annual (17% off)
    const professionalAnnual = await stripe.prices.create({
      product: product.id,
      unit_amount: 49000, // $490.00 per year (saves $98)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'ReleasePilot Professional - Annual',
      metadata: {
        tier: 'professional',
        repo_limit: '20',
        billing: 'annual',
        savings: '17%',
        popular: 'true'
      }
    });
    console.log('✅ Professional Annual:', professionalAnnual.id);

    // Create Enterprise tier - Monthly
    console.log('\nCreating Enterprise tier pricing...');
    const enterpriseMonthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 19900, // $199.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'ReleasePilot Enterprise - Monthly',
      metadata: {
        tier: 'enterprise',
        repo_limit: 'unlimited',
        billing: 'monthly',
        sla: 'true'
      }
    });
    console.log('✅ Enterprise Monthly:', enterpriseMonthly.id);

    // Create Enterprise tier - Annual (17% off)
    const enterpriseAnnual = await stripe.prices.create({
      product: product.id,
      unit_amount: 199000, // $1990.00 per year (saves $398)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      nickname: 'ReleasePilot Enterprise - Annual',
      metadata: {
        tier: 'enterprise',
        repo_limit: 'unlimited',
        billing: 'annual',
        savings: '17%',
        sla: 'true'
      }
    });
    console.log('✅ Enterprise Annual:', enterpriseAnnual.id);

    // Create coupon codes
    console.log('\n🎫 Creating promotional coupons...');
    
    // ProductHunt Launch coupon
    const phCoupon = await stripe.coupons.create({
      id: 'PRODUCTHUNT50',
      percent_off: 50,
      duration: 'repeating',
      duration_in_months: 3,
      metadata: {
        campaign: 'producthunt_launch'
      }
    });
    console.log('✅ ProductHunt coupon (50% off 3 months):', phCoupon.id);

    // Early Bird coupon
    const earlyBirdCoupon = await stripe.coupons.create({
      id: 'EARLYBIRD30',
      percent_off: 30,
      duration: 'forever',
      max_redemptions: 100,
      metadata: {
        campaign: 'early_bird'
      }
    });
    console.log('✅ Early Bird coupon (30% off forever):', earlyBirdCoupon.id);

    // Non-profit coupon
    const nonprofitCoupon = await stripe.coupons.create({
      id: 'NONPROFIT50',
      percent_off: 50,
      duration: 'forever',
      metadata: {
        campaign: 'nonprofit_discount'
      }
    });
    console.log('✅ Non-profit coupon (50% off forever):', nonprofitCoupon.id);

    // Student coupon
    const studentCoupon = await stripe.coupons.create({
      id: 'STUDENT80',
      percent_off: 80,
      duration: 'forever',
      metadata: {
        campaign: 'student_discount'
      }
    });
    console.log('✅ Student coupon (80% off forever):', studentCoupon.id);

    console.log('\n✨ Success! ReleasePilot products have been created in your Stripe account.');
    console.log('\n📋 Summary:');
    console.log('- Product ID:', product.id);
    console.log('- 6 price tiers created (3 monthly, 3 annual)');
    console.log('- 4 promotional coupons created');
    
    console.log('\n💡 Next steps:');
    console.log('1. Update your webhook endpoint to handle ReleasePilot subscriptions');
    console.log('2. Test the checkout flow with test cards');
    console.log('3. Configure the customer portal settings');
    
    console.log('\n🔗 Price IDs for your application:');
    console.log(`
export const RELEASEPILOT_PRICES = {
  starter: {
    monthly: '${starterMonthly.id}',
    annual: '${starterAnnual.id}'
  },
  professional: {
    monthly: '${professionalMonthly.id}',
    annual: '${professionalAnnual.id}'
  },
  enterprise: {
    monthly: '${enterpriseMonthly.id}',
    annual: '${enterpriseAnnual.id}'
  }
};
    `);

    return {
      productId: product.id,
      prices: {
        starterMonthly: starterMonthly.id,
        starterAnnual: starterAnnual.id,
        professionalMonthly: professionalMonthly.id,
        professionalAnnual: professionalAnnual.id,
        enterpriseMonthly: enterpriseMonthly.id,
        enterpriseAnnual: enterpriseAnnual.id
      }
    };

  } catch (error) {
    console.error('❌ Error creating products:', error.message);
    throw error;
  }
}

// Run the setup
createReleasePilotProducts()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });