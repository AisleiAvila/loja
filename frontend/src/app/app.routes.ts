import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/home-page.component').then(m => m.HomePageComponent),
		title: 'Luz do Atlântico | Home'
	},
	{
		path: 'produto/:slug',
		loadComponent: () => import('./pages/product-page.component').then(m => m.ProductPageComponent),
		title: 'Luz do Atlântico | Produto'
	},
	{
		path: 'sobre',
		loadComponent: () => import('./pages/about-page.component').then(m => m.AboutPageComponent),
		title: 'Luz do Atlântico | Sobre'
	},
	{
		path: 'contacto',
		loadComponent: () => import('./pages/contact-page.component').then(m => m.ContactPageComponent),
		title: 'Luz do Atlântico | Contacto'
	},
	{
		path: 'checkout',
		loadComponent: () => import('./pages/checkout-page.component').then(m => m.CheckoutPageComponent),
		title: 'Luz do Atlântico | Checkout',
		canDeactivate: [(component: { canDeactivate(): boolean }) => component.canDeactivate()]
	},
	{
		path: 'obrigado',
		loadComponent: () => import('./pages/thank-you-page.component').then(m => m.ThankYouPageComponent),
		title: 'Luz do Atlântico | Obrigado'
	},
	{
		path: 'admin',
		loadComponent: () => import('./pages/admin-page.component').then(m => m.AdminPageComponent),
		title: 'Luz do Atlântico | Admin'
	},
	{
		path: '**',
		loadComponent: () => import('./pages/not-found-page.component').then(m => m.NotFoundPageComponent),
		title: 'Luz do Atlântico | Página não encontrada'
	}
];
