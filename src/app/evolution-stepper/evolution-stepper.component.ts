import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Animal, EvolutionStage } from '../../types';
@Component({
  selector: 'app-evolution-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evolution-stepper.component.html',
  styleUrl: './evolution-stepper.component.css'
})
export class EvolutionStepperComponent {
  @Input() monster!: Animal; 
EvolutionStage: typeof EvolutionStage = EvolutionStage;


  // derive current stage of evolution from monster data
  get currentStage() {
    return EvolutionStage[this.monster.evolutionStage as unknown as keyof typeof EvolutionStage]
  }


  progressWidth(i: number) {
    // EvolutionStage[i] === EvolutionStage[this.monster.evolutionStage] ? (this.monster.progressTowardsNextEvolution + '%') : (this.monster.evolutionStage > i ? '100%' : '0%')
    debugger
    const s = EvolutionStage[this.monster.evolutionStage];
    // @ts-ignore
    if ((i) === EvolutionStage[this.monster.evolutionStage])
      return (this.monster.progressTowardsNextEvolution * 100) + '%';
      // @ts-ignore
    else if (s > i)
      return '100%';
    else
      return '0%';

  }

  get progress() {
    // Example calculation, adjust based on your actual data and requirements
    // const progressTowardsNextStage = this.monster.progress; // Assuming this is a value between 0 and 1
    return this.monster.progressTowardsNextEvolution
  }
}
