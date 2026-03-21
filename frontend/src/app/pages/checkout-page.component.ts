import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../services/api.service';
import { OrderFormValue, Product } from '../types';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly products = signal<Product[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly infoMessage = signal('');
  protected readonly submitting = signal(false);
  protected readonly paymentMethods = [
    { id: 'mbway', label: 'MB WAY' },
    { id: 'multibanco', label: 'Referência Multibanco' },
    { id: 'card', label: 'Cartão de crédito ou débito' },
    { id: 'transfer', label: 'Transferência bancária' }
  ];

  protected readonly checkoutForm = this.formBuilder.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    customerName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: ['', Validators.required],
    postalCode: ['', Validators.required],
    city: ['', Validators.required],
    paymentMethod: ['mbway', Validators.required],
    notes: ['']
  });

  protected readonly selectedProduct = computed(() => {
    const productId = this.checkoutForm.controls.productId.value;
    return this.products().find((product) => product.id === productId) ?? null;
  });

  protected readonly total = computed(() => {
    const product = this.selectedProduct();
    const quantity = Number(this.checkoutForm.controls.quantity.value || 1);

    return product ? product.price * quantity : 0;
  });

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('cancelled') === '1') {
      this.infoMessage.set('O pagamento por cartão foi cancelado. Pode tentar novamente ou escolher outro método.');
    }

    this.apiService.getProducts().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((products) => {
      this.products.set(products);

      const requestedProduct = this.route.snapshot.queryParamMap.get('product');
      const fallback = requestedProduct && products.some((product) => product.id === requestedProduct)
        ? requestedProduct
        : products[0]?.id;

      if (fallback) {
        this.checkoutForm.patchValue({ productId: fallback });
      }
    });
  }

  protected submit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.apiService.createOrder(this.checkoutForm.getRawValue() as OrderFormValue).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ order, redirectUrl, paymentProvider }) => {
        if (this.isBrowser) localStorage.setItem('last-order', JSON.stringify(order));

        if (paymentProvider === 'stripe' && redirectUrl) {
          if (this.isBrowser) globalThis.location.href = redirectUrl;
          return;
        }

        void this.router.navigate(['/obrigado'], {
          state: { order },
          queryParams: { orderId: order.id }
        });
      },
      error: () => {
        this.errorMessage.set('Não foi possível concluir o pedido. Tente novamente.');
        this.submitting.set(false);
      }
    });
  }

  canDeactivate(): boolean {
    if (this.submitting()) return true;
    const { customerName, email, phone, address } = this.checkoutForm.getRawValue();
    const hasData = !!(customerName || email || phone || address);
    if (!hasData) return true;
    return confirm('Tem dados preenchidos no formulário. Tem a certeza que deseja sair?');
  }
}
