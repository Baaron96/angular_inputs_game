import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { BreedingServiceService } from './breeding-service.service';
import { IndexedDBService } from './indexed-db.service';
import { MonsterSelectionService } from './service/monster-selection-service/monster-selection-service.service';
import { BreedingPod, EvolutionStage } from '../types';
@Injectable({
  providedIn: 'root'
})
export class AnimalService {
  private animalsSubject = new BehaviorSubject<any[]>([]);
  public animals$ = this.animalsSubject.asObservable();
  private filteredAnimalsSubject = new BehaviorSubject<any[]>([]);
  public filteredAnimals$ = this.filteredAnimalsSubject.asObservable();
  private breedingAnimalsSubject = new BehaviorSubject<BreedingPod[]>([]);
  public breedingAnimals$ = this.breedingAnimalsSubject.asObservable();


  constructor(private indexedDBService: IndexedDBService, private selectionService: MonsterSelectionService, private breedingService: BreedingServiceService) {
    this.loadInitialData();
    this.initializeFilteredAnimals();
    this.setupMaturingProcess();
  }

  private async loadInitialData() {
    try {
      const animals = await this.indexedDBService.loadAllAnimals();
      this.animalsSubject.next(animals);
    } catch (error) {
      console.error('Failed to load animals from IndexedDB:', error);
    }
  }

  private initializeFilteredAnimals() {
    combineLatest([this.animals$, this.selectionService.getSelectedMonstersObservable(), this.breedingService.breedingPods$])
      .subscribe(([animals, selectedMonsters, breedingPods]) => {
        const breedingMonsters = breedingPods.flatMap(pod => pod.parents); // Flatten all monsters in pods
        // Ensure we have a list of UUIDs for selected monsters for a more reliable comparison
        const selectedMonsterUUIDs = selectedMonsters.map(monster => monster.uuid);
        // Filter out selected and breeding animals
        const filtered = animals.filter(animal => 
          !selectedMonsterUUIDs.includes(animal.uuid) && // Check against UUIDs for selected monsters
          !breedingMonsters.find(m => m.uuid === animal.uuid)); // Exclude breeding animals
        this.filteredAnimalsSubject.next(filtered);
      });
  }

  private setupMaturingProcess() {
    setInterval(() => {
      const updatedAnimals = this.animalsSubject.getValue().map(monster => {
        // @ts-ignore
        if (EvolutionStage[monster.evolutionStage] === EvolutionStage.adult) {
          return monster;
        }
        if (!monster.lastEvolutionTimestamp) {
          monster.lastEvolutionTimestamp = new Date(monster.birthTimestamp);
        }
        const cycleTimeMilis = monster.species.cycleTime * 24 * 60 * 60 * 10; // Corrected to milliseconds
  
        let lastEvolutionTime = monster.lastEvolutionTimestamp instanceof Date ? monster.lastEvolutionTimestamp.getTime() : new Date(monster.lastEvolutionTimestamp).getTime();
        let timeSinceLastEvolution = Date.now() - lastEvolutionTime;
        let progressPercentage = Math.min((timeSinceLastEvolution / cycleTimeMilis) * 100, 100);
  
        // Keep evolving the monster as long as it's eligible
        while (timeSinceLastEvolution >= cycleTimeMilis || progressPercentage >= 1) {
          monster.lastEvolutionTimestamp = new Date(lastEvolutionTime + cycleTimeMilis); // Update to the time of this evolution
          const stages = [EvolutionStage.baby, EvolutionStage.teen, EvolutionStage.adult];
          let stageInt = EvolutionStage[monster.evolutionStage] // das hier ist int
          // @ts-ignore
          if (stageInt === 2) return monster;
          // @ts-ignore
          monster.evolutionStage = EvolutionStage[stages[stageInt + 1]];
          monster.progressTowardsNextEvolution = 0;
  
          // Calculate the time and progress for the next potential evolution
          lastEvolutionTime = monster.lastEvolutionTimestamp.getTime();
          timeSinceLastEvolution = Date.now() - lastEvolutionTime;
          progressPercentage = Math.min((timeSinceLastEvolution / cycleTimeMilis) * 100, 100);
        }
  
        // If the monster is not yet ready for the next evolution, update the progress
        monster.progressTowardsNextEvolution = progressPercentage;
  
        return monster;
      });
  
      this.animalsSubject.next(updatedAnimals);
      updatedAnimals.forEach(monster => this.updateAnimal(monster));
    }, 3000); // Execute every 3000ms (3 seconds)
  }





  addAnimal(animal: any) {
    this.indexedDBService.addAnimal(animal).then(() => {
      this.loadInitialData(); // Reload the animals list to include the new animal
      this.initializeFilteredAnimals(); // Reload the filtered animals list to exclude the selece animals
    }).catch(error => {
      console.error('Failed to add animal:', error);
    });
  }

  getAnimal(uuid: string) {
    return this.indexedDBService.getAnimal(uuid);
  }

  deleteAnimal(uuid: string) {
    this.indexedDBService.deleteAnimal(uuid).then(() => {
      // remove the animal from the selection service
      this.selectionService.deselectMonster(this.selectionService.getSelectedMonsters().find(animal => animal.uuid === uuid));
      // remove the animal from the list of animals and or the filtered animals
      //this.selectionService.getSelectedMonsters().find(animal => animal.uuid === uuid) ? this.loadInitialData() : this.filteredAnimalsSubject.next(this.filteredAnimalsSubject.getValue().filter(animal => animal.uuid !== uuid));
    }).catch(error => {
      console.error('Failed to delete animal:', error);
    }).finally(() => {
      this.loadInitialData(); // Reload the animals list to reflect the deletion
    });
  }

  updateAnimal(animal: any) {
    // Check if the animal still exists in the animalsSubject
    const existingAnimal = this.animalsSubject.getValue().find(a => a.uuid === animal.uuid);
    if (existingAnimal) {
      this.indexedDBService.updateRecord(animal).then(() => {
        this.loadInitialData(); // Reload the animals list to reflect the update
      }).catch(error => {
        console.error('Failed to update animal:', error);
      });
    } else {
      // If the animal doesn't exist in the animalsSubject, delete it from the database
      this.indexedDBService.deleteAnimal(animal.uuid).then(() => {
        console.log(`Animal with uuid ${animal.uuid} was not found in animalsSubject and has been deleted from the database.`);
      }).catch(error => {
        console.error('Failed to delete animal:', error);
      });
    }
  }
}