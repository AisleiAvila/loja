import { Routes } from '@angular/router';

import { AboutPageComponent } from './pages/about-page.component';
import { AdminPageComponent } from './pages/admin-page.component';
import { CheckoutPageComponent } from './pages/checkout-page.component';
import { ContactPageComponent } from './pages/contact-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { ProductPageComponent } from './pages/product-page.component';
import { ThankYouPageComponent } from './pages/thank-you-page.component';

export const routes: Routes = [
	{
		path: '',
		component: HomePageComponent,
		title: 'Luz do Atlântico | Home'
	},
	{
		path: 'produto/:slug',
		component: ProductPageComponent,
		title: 'Luz do Atlântico | Produto'
	},
	{
		path: 'sobre',
		component: AboutPageComponent,
		title: 'Luz do Atlântico | Sobre'
	},
	{
		path: 'contacto',
		component: ContactPageComponent,
		title: 'Luz do Atlântico | Contacto'
	},
	{
		path: 'checkout',
		component: CheckoutPageComponent,
		title: 'Luz do Atlântico | Checkout'
	},
	{
		path: 'obrigado',
		component: ThankYouPageComponent,
		title: 'Luz do Atlântico | Obrigado'
	},
	{
		path: 'admin',
		component: AdminPageComponent,
		title: 'Luz do Atlântico | Admin'
	},
	{
		path: '**',
		redirectTo: ''
	}
];
