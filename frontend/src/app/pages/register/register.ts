import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { authErrorMessage } from '../auth-error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismas reglas que la API (specs/002-taskflow-v2/spec.md, RF-008).
function nameErrors(control: AbstractControl<string>): ValidationErrors | null {
  const name = control.value.trim();
  if (!name) {
    return { message: 'El nombre es obligatorio' };
  }
  return name.length > 60 ? { message: 'El nombre no puede superar los 60 caracteres' } : null;
}

function emailErrors(control: AbstractControl<string>): ValidationErrors | null {
  return EMAIL_PATTERN.test(control.value.trim()) ? null : { message: 'El correo no es válido' };
}

function passwordErrors(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.length < 8
    ? { message: 'La contraseña debe tener al menos 8 caracteres' }
    : null;
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [nameErrors] }),
      email: new FormControl('', { nonNullable: true, validators: [emailErrors] }),
      password: new FormControl('', { nonNullable: true, validators: [passwordErrors] }),
      confirm: new FormControl('', { nonNullable: true }),
    },
    { validators: [passwordsMatch] },
  );

  /** Mensaje de validación de un campo, solo después de intentar enviar. */
  protected message(name: 'name' | 'email' | 'password'): string | null {
    return this.submitted() ? (this.form.controls[name].errors?.['message'] ?? null) : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) {
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.register(name.trim(), email.trim(), password).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.error.set(authErrorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
